---
layout: docs
lang: es
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /es/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — ejecución de código en un hilo paralelo separado: transferencia de datos, WeakReference/WeakMap, ThreadChannel, Future entre hilos."
---

# Async\Thread: ejecutar PHP en un hilo separado

## Por qué se necesitan los hilos

Las corrutinas resuelven el problema de concurrencia para cargas de trabajo **limitadas por I/O** — un solo proceso puede manejar
miles de esperas concurrentes de red o disco. Pero las corrutinas tienen una limitación: todas se ejecutan
**en el mismo proceso PHP** y se turnan para recibir el control del planificador. Si una tarea es
**limitada por CPU** — compresión, análisis, criptografía, cálculos pesados — una sola corrutina de este tipo
bloqueará el planificador, y todas las demás corrutinas se detendrán hasta que termine.

Los hilos resuelven esta limitación. `Async\Thread` ejecuta un cierre en un **hilo paralelo separado**
con su **propio entorno PHP aislado**: su propio conjunto de variables, su propio autocargador, sus propias clases
y funciones. Nada se comparte directamente entre hilos — cualquier dato se pasa **por valor**,
mediante copia profunda.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker en la corrutina principal — demuestra que el hilo paralelo
// no impide que el programa principal continúe
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Cálculo pesado en un hilo separado
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

El ticker completa tranquilamente sus 5 "ticks" de forma concurrente con el trabajo pesado del hilo — el programa principal
no tiene que esperar.

## Cuándo usar hilos vs corrutinas

| Tarea                                                     | Herramienta               |
|-----------------------------------------------------------|---------------------------|
| Muchas peticiones HTTP/BD/archivo concurrentes            | Corrutinas                |
| Trabajo largo limitado por CPU (análisis, criptografía)   | Hilos                     |
| Aislar código inestable                                   | Hilos                     |
| Trabajo paralelo en múltiples núcleos de CPU              | Hilos                     |
| Intercambio de datos entre tareas                         | Corrutinas + canales      |

Un hilo es una **entidad relativamente costosa**: iniciar un nuevo hilo es un orden de magnitud
más pesado que iniciar una corrutina. Por eso no se crean miles de ellos: el modelo típico
es unos pocos hilos de trabajo de larga duración (a menudo iguales al número de núcleos de CPU), o un hilo
para una tarea pesada específica.

## Ciclo de vida

```php
// Creación — el hilo comienza y empieza a ejecutarse inmediatamente
$thread = spawn_thread(fn() => compute());

// Espera del resultado. La corrutina llamante espera; otras continúan ejecutándose
$result = await($thread);

// O una verificación no bloqueante
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` implementa la interfaz `Completable`, por lo que puede pasarse a `await()`,
`await_all()`, `await_any()` y `Task\Group` — exactamente igual que una corrutina normal.

### Estados

| Método            | Qué verifica                                                         |
|-------------------|----------------------------------------------------------------------|
| `isRunning()`     | El hilo todavía está ejecutándose                                    |
| `isCompleted()`   | El hilo ha terminado (correctamente o con una excepción)             |
| `isCancelled()`   | El hilo fue cancelado                                                |
| `getResult()`     | El resultado si terminó correctamente; de lo contrario `null`        |
| `getException()`  | La excepción si terminó con un error; de lo contrario `null`         |

### Manejo de excepciones

Una excepción lanzada dentro de un hilo es capturada y entregada al padre envuelta
en `Async\RemoteException`:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()` puede devolver `null` si la clase de excepción no pudo cargarse en el hilo padre
(por ejemplo, es una clase definida por el usuario que solo existe en el hilo receptor).

## Transferencia de datos entre hilos

Esta es la parte más importante del modelo. **Todo se transfiere por copia** — sin referencias compartidas.

### Qué se puede transferir

| Tipo                                                    | Comportamiento                                                           |
|---------------------------------------------------------|--------------------------------------------------------------------------|
| Escalares (`int`, `float`, `string`, `bool`, `null`)    | Copiados                                                                 |
| Arrays                                                  | Copia profunda; los objetos anidados preservan la identidad              |
| Objetos con propiedades declaradas (`public $x`, etc.) | Copia profunda; recreados desde cero en el lado receptor                 |
| `Closure`                                               | El cuerpo de la función se transfiere junto con todas las vars `use(...)` |
| `WeakReference`                                         | Transferido junto con el referente (ver abajo)                           |
| `WeakMap`                                               | Transferido con todas las claves y valores (ver abajo)                   |
| `Async\FutureState`                                     | Solo una vez, para escribir un resultado desde el hilo (ver abajo)       |

### Qué no se puede transferir

| Tipo                                                   | Por qué                                                                                          |
|--------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `stdClass` y cualquier objeto con propiedades dinámicas | Las propiedades dinámicas no tienen declaración a nivel de clase y no pueden recrearse correctamente en el hilo receptor |
| Referencias PHP (`&$var`)                              | Una referencia compartida entre hilos contradice el modelo                                       |
| Recursos (`resource`)                                  | Descriptores de archivo, manejadores curl, sockets están vinculados a un hilo específico         |

Intentar transferir cualquiera de estos lanzará inmediatamente `Async\ThreadTransferException` en el origen:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // propiedades dinámicas
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### La identidad de objetos se preserva

El mismo objeto referenciado múltiples veces en un grafo de datos se **crea solo una vez en el hilo receptor**,
y todas las referencias apuntan a él. Dentro de una sola operación de transferencia (todas las variables de
`use(...)` de un cierre, un envío de canal, un resultado de hilo) la identidad se preserva:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// La clase debe declararse en el entorno del hilo receptor — lo hacemos mediante un cargador de arranque
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // La misma instancia en dos variables diferentes
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // Una mutación a través de una referencia es visible a través de la otra
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

Lo mismo aplica a objetos enlazados dentro de un solo grafo: un array con referencias a objetos anidados compartidos
preservará la identidad después de la transferencia.

### Ciclos

Un grafo con un ciclo a través de objetos regulares puede transferirse. La limitación es que los ciclos
muy profundamente anidados pueden alcanzar el límite interno de profundidad de transferencia (cientos de niveles). En la práctica,
esto casi nunca ocurre. Los ciclos de la forma `$node->weakParent = WeakReference::create($node)` — es decir,
un objeto que se referencia a sí mismo mediante un `WeakReference` — actualmente encuentran el mismo límite, así que
es mejor no usarlos dentro de un solo grafo transferido.

## WeakReference entre hilos

`WeakReference` tiene lógica de transferencia especial. El comportamiento depende de qué más se transfiere junto a él.

### El referente también se transfiere — la identidad se preserva

Si el propio objeto se transfiere junto con el `WeakReference` (directamente, dentro de un array,
o como propiedad de otro objeto), entonces en el lado receptor `$wr->get()` devuelve **exactamente
esa** instancia que terminó en las otras referencias:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### El referente no se transfiere — WeakReference queda muerto

Si solo se transfiere el `WeakReference` pero no el propio objeto, entonces en el hilo receptor
nadie tiene una referencia fuerte a ese objeto. Según las reglas de PHP, esto significa que el objeto es destruido
inmediatamente y el `WeakReference` queda **muerto** (`$wr->get() === null`). Este es exactamente el mismo
comportamiento que en PHP de un solo hilo: sin un propietario fuerte, el objeto es recolectado.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj NO se transfiere
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### El origen ya está muerto

Si el `WeakReference` ya estaba muerto en el origen en el momento de la transferencia (`$wr->get() === null`),
llegará al hilo receptor también muerto.

### Singleton

`WeakReference::create($obj)` devuelve un singleton: dos llamadas para el mismo objeto producen **la misma**
instancia de `WeakReference`. Esta propiedad se preserva durante la transferencia — en el hilo receptor también habrá
exactamente una instancia de `WeakReference` por objeto.

## WeakMap entre hilos

`WeakMap` se transfiere con todas sus entradas. Pero se aplica la misma regla que en PHP de un solo hilo:
**una clave de `WeakMap` vive solo mientras alguien tenga una referencia fuerte a ella**.

### Las claves están en el grafo — las entradas sobreviven

Si las claves se transfieren por separado (o son alcanzables a través de otros objetos transferidos), el
`WeakMap` en el hilo receptor contiene todas las entradas:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Solo WeakMap — las entradas desaparecen

Si solo se transfiere el `WeakMap` y sus claves no aparecen en ningún otro lugar del grafo, el
`WeakMap` **estará vacío en el hilo receptor**. Esto no es un error; es una consecuencia directa
de la semántica débil: sin un propietario fuerte, la clave se destruye inmediatamente después de ser cargada y
la entrada correspondiente desaparece.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost no se transfiere
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

Para que una entrada "sobreviva" la transferencia, su clave debe transferirse por separado (o como parte de algún
otro objeto que esté incluido en el grafo).

### Estructuras anidadas

Un `WeakMap` puede contener otros `WeakMap`s, `WeakReference`s, arrays y objetos regulares como valores —
todo se transfiere de forma recursiva. Los ciclos de la forma `$wm[$obj] = $wm` se manejan correctamente.

## Future entre hilos

Transferir directamente un `Async\Future` entre hilos **no es posible**: un `Future` es un objeto de espera
cuyos eventos están vinculados al planificador del hilo en el que fue creado. En cambio, puedes
transferir el lado "escritor" — `Async\FutureState` — y solo **una vez**.

El patrón típico: el padre crea un par `FutureState` + `Future`, pasa el propio `FutureState`
al hilo mediante una variable `use(...)`, el hilo llama `complete()` o `error()`, y el
padre recibe el resultado a través de su `Future`:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // Simulando trabajo pesado
        $data = "computed in thread";
        $state->complete($data);
    });

    // El padre espera a través de su propio Future — el evento llega aquí
    // cuando el hilo llama $state->complete()
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**Restricciones importantes:**

1. `FutureState` puede transferirse a **solo un** hilo. Un segundo intento de transferencia lanzará una excepción.
2. No se permite transferir el propio `Future` — pertenece al hilo padre y solo puede
   despertar a su propio propietario.
3. Después de que `FutureState` sea transferido, el objeto original en el padre sigue siendo válido: cuando el
   hilo llama `complete()`, ese cambio se hace visible a través del `Future` en el padre —
   `await($future)` se desbloquea.

Esta es la única forma estándar de entregar **un único resultado** desde un hilo al llamante,
aparte del `return` ordinario de `spawn_thread()`. Si necesitas transmitir muchos valores, usa
`ThreadChannel`.

## Bootloader: preparando el entorno del hilo

Un hilo tiene **su propio entorno** y no hereda las definiciones de clases, funciones o constantes
declaradas en el script padre. Si un cierre usa una clase definida por el usuario, esa clase debe
redeclararse o cargarse a través de autoload — para esto existe el parámetro `bootloader`:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config debe existir en el hilo
        return $config->name;
    },
    bootloader: function() {
        // Se ejecuta en el hilo receptor ANTES del cierre principal
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Se garantiza que el bootloader se ejecute en el hilo receptor antes de que las variables `use(...)` sean
cargadas y antes de que se llame al cierre principal. Tareas típicas del bootloader: registrar autoload,
declarar clases mediante `eval`, establecer opciones de ini, cargar bibliotecas.

## Casos extremos

### Superglobales

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` son propios del hilo — se inicializan de nuevo,
como en una nueva petición. En la versión actual de TrueAsync, poblarlos en hilos receptores está
temporalmente deshabilitado (planeado para habilitarse más adelante) — consulta el CHANGELOG.

### Variables estáticas de funciones

Cada hilo tiene su propio conjunto de variables estáticas de funciones y clases. Los cambios en un hilo no
son visibles para otros — esto es parte del aislamiento general.

### Opcache

Opcache comparte su caché de bytecode compilado entre hilos como solo lectura: los scripts se compilan una vez
para todo el proceso, y cada nuevo hilo reutiliza el bytecode listo. Esto hace que el inicio del hilo
sea más rápido.

## Ver también

- [`spawn_thread()`](/es/docs/reference/spawn-thread.html) — ejecutar un cierre en un hilo
- [`Async\ThreadChannel`](/es/docs/components/thread-channels.html) — canales entre hilos
- [`await()`](/es/docs/reference/await.html) — esperar el resultado de un hilo
- [`Async\RemoteException`](/es/docs/components/exceptions.html) — envoltorio para errores del hilo receptor
