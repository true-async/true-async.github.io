---
layout: docs
lang: es
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /es/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "La clase Async\\Coroutine -- creacion, ciclo de vida, estados, cancelacion, depuracion y referencia completa de metodos."
---

# La Clase Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Corrutinas en TrueAsync

Cuando una funcion regular llama a una operacion de E/S como `fread` o `fwrite` (leer un archivo o hacer una solicitud de red),
el control se pasa al kernel del sistema operativo, y `PHP` se bloquea hasta que la operacion se completa.

Pero si una funcion se ejecuta dentro de una corrutina y llama a una operacion de E/S,
solo la corrutina se bloquea, no todo el proceso de `PHP`.
Mientras tanto, el control se pasa a otra corrutina, si existe una.

En este sentido, las corrutinas son muy similares a los hilos del sistema operativo,
pero se gestionan en el espacio de usuario en lugar de por el kernel del SO.

Otra diferencia importante es que las corrutinas comparten el tiempo de CPU por turnos,
cediendo el control voluntariamente, mientras que los hilos pueden ser interrumpidos en cualquier momento.

Las corrutinas de TrueAsync se ejecutan dentro de un solo hilo
y no son paralelas. Esto lleva a varias consecuencias importantes:
- Las variables pueden ser leidas y modificadas libremente desde diferentes corrutinas sin bloqueos, ya que no se ejecutan simultaneamente.
- Las corrutinas no pueden usar simultaneamente multiples nucleos de CPU.
- Si una corrutina realiza una operacion sincrona larga, bloquea todo el proceso, ya que no cede el control a otras corrutinas.

## Creacion de una Corrutina

Una corrutina se crea usando la funcion `spawn()`:

```php
use function Async\spawn;

// Crear una corrutina
$coroutine = spawn(function() {
    echo "Hola desde una corrutina!\n";
    return 42;
});

// $coroutine es un objeto de tipo Async\Coroutine
// La corrutina ya esta programada para ejecucion
```

Una vez que se llama a `spawn`, la funcion se ejecutara asincronamente por el planificador tan pronto como sea posible.

## Pasar Parametros

La funcion `spawn` acepta un `callable` y cualquier parametro que se pasara a esa funcion
cuando se inicie.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Pasar la funcion y los parametros
$coroutine = spawn(fetchUser(...), 123);
```

## Obtener el Resultado

Para obtener el resultado de una corrutina, usa `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Listo!";
});

echo "Corrutina iniciada\n";

// Esperar el resultado
$result = await($coroutine);

echo "Resultado: $result\n";
```

**Importante:** `await()` bloquea la ejecucion de la **corrutina actual**, pero no todo el proceso de `PHP`.
Otras corrutinas continuan ejecutandose.

## Ciclo de Vida de la Corrutina

Una corrutina pasa por varios estados:

1. **En cola** -- creada via `spawn()`, esperando ser iniciada por el planificador
2. **Ejecutandose** -- actualmente en ejecucion
3. **Suspendida** -- pausada, esperando E/S o `suspend()`
4. **Completada** -- finalizo la ejecucion (con un resultado o una excepcion)
5. **Cancelada** -- cancelada via `cancel()`

### Verificacion del Estado

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - esperando para iniciar
var_dump($coro->isStarted());   // false - aun no ha comenzado

suspend(); // dejar que la corrutina inicie

var_dump($coro->isStarted());    // true - la corrutina ha comenzado
var_dump($coro->isRunning());    // false - no esta ejecutandose actualmente
var_dump($coro->isSuspended());  // true - suspendida, esperando algo
var_dump($coro->isCompleted());  // false - aun no ha terminado
var_dump($coro->isCancelled());  // false - no cancelada
```

## Suspension: suspend

La palabra clave `suspend` detiene la corrutina y pasa el control al planificador:

```php
spawn(function() {
    echo "Antes de suspend\n";

    suspend(); // Nos detenemos aqui

    echo "Despues de suspend\n";
});

echo "Codigo principal\n";

// Salida:
// Antes de suspend
// Codigo principal
// Despues de suspend
```

La corrutina se detuvo en `suspend`, el control regreso al codigo principal. Mas tarde, el planificador reanudo la corrutina.

### suspend con espera

Tipicamente `suspend` se usa para esperar algun evento:

```php
spawn(function() {
    echo "Haciendo una solicitud HTTP\n";

    $data = file_get_contents('https://api.example.com/data');
    // Dentro de file_get_contents, suspend se llama implicitamente
    // Mientras la solicitud de red esta en progreso, la corrutina esta suspendida

    echo "Datos obtenidos: $data\n";
});
```

PHP suspende automaticamente la corrutina en operaciones de E/S. No necesitas escribir `suspend` manualmente.

## Cancelar una Corrutina

```php
$coro = spawn(function() {
    try {
        echo "Iniciando trabajo largo\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Dormir 100ms
            echo "Iteracion $i\n";
        }

        echo "Terminado\n";
    } catch (Async\AsyncCancellation $e) {
        echo "Fui cancelado durante la iteracion\n";
    }
});

// Dejar que la corrutina trabaje por 1 segundo
Async\sleep(1000);

// Cancelarla
$coro->cancel();

// La corrutina recibira AsyncCancellation en el proximo await/suspend
```

**Importante:** La cancelacion funciona cooperativamente. La corrutina debe verificar la cancelacion (via `await`, `sleep`, o `suspend`). No puedes matar forzosamente una corrutina.

## Multiples Corrutinas

Lanza tantas como quieras:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Esperar todas las corrutinas
$results = array_map(fn($t) => await($t), $tasks);

echo "Cargados " . count($results) . " resultados\n";
```

Las 10 solicitudes se ejecutan concurrentemente. En lugar de 10 segundos (un segundo cada una), se completa en ~1 segundo.

## Manejo de Errores

Los errores en corrutinas se manejan con el `try-catch` regular:

```php
$coro = spawn(function() {
    throw new Exception("Ups!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Error capturado: " . $e->getMessage() . "\n";
}
```

Si el error no es capturado, sube al scope padre:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Error en la corrutina!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Error subio al scope: " . $e->getMessage() . "\n";
}
```

## Corrutina = Objeto

Una corrutina es un objeto PHP completo. Puedes pasarla a cualquier lugar:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Trabajo largo
        Async\sleep(10000);
        return "Resultado";
    });
}

$task = startBackgroundTask();

// Pasar a otra funcion
processTask($task);

// O almacenar en un array
$tasks[] = $task;

// O en una propiedad de objeto
$this->backgroundTask = $task;
```

## Corrutinas Anidadas

Las corrutinas pueden lanzar otras corrutinas:

```php
spawn(function() {
    echo "Corrutina padre\n";

    $child1 = spawn(function() {
        echo "Corrutina hija 1\n";
        return "Resultado 1";
    });

    $child2 = spawn(function() {
        echo "Corrutina hija 2\n";
        return "Resultado 2";
    });

    // Esperar ambas corrutinas hijas
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Padre recibio: $result1 y $result2\n";
});
```

## Finally: Limpieza Garantizada

Incluso si una corrutina es cancelada, `finally` se ejecutara:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Puede ser cancelado aqui
        }
    } finally {
        // El archivo sera cerrado sin importar que
        fclose($file);
        echo "Archivo cerrado\n";
    }
});
```

## Depuracion de Corrutinas

### Obtener la Pila de Llamadas

```php
$coro = spawn(function() {
    doSomething();
});

// Obtener la pila de llamadas de la corrutina
$trace = $coro->getTrace();
print_r($trace);
```

### Saber Donde Se Creo una Corrutina

```php
$coro = spawn(someFunction(...));

// Donde se llamo a spawn()
echo "Corrutina creada en: " . $coro->getSpawnLocation() . "\n";
// Salida: "Corrutina creada en: /app/server.php:42"

// O como un array [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Saber Donde Esta Suspendida una Corrutina

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // se suspende aqui
});

suspend(); // dejar que la corrutina inicie

echo "Suspendida en: " . $coro->getSuspendLocation() . "\n";
// Salida: "Suspendida en: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Informacion de Espera

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Averiguar que esta esperando la corrutina
$info = $coro->getAwaitingInfo();
print_r($info);
```

Muy util para depuracion -- puedes ver inmediatamente de donde vino una corrutina y donde se detuvo.

## Corrutinas vs Hilos

| Corrutinas                    | Hilos                         |
|-------------------------------|-------------------------------|
| Ligeras                       | Pesados                       |
| Creacion rapida (<1us)        | Creacion lenta (~1ms)         |
| Un solo hilo del SO           | Multiples hilos del SO        |
| Multitarea cooperativa        | Multitarea preemptiva         |
| Sin condiciones de carrera    | Posibles condiciones de carrera |
| Requiere puntos de await      | Puede ser interrumpido en cualquier lugar |
| Para operaciones de E/S       | Para computaciones de CPU     |

## Cancelacion Diferida con protect()

Si una corrutina esta dentro de una seccion protegida via `protect()`, la cancelacion se difiere hasta que el bloque protegido se complete:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Operacion critica -- la cancelacion se difiere
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "guardado";
    });

    // La cancelacion ocurrira aqui, despues de salir de protect()
    echo "Resultado: $result\n";
});

suspend();

$coro->cancel(); // La cancelacion se difiere -- protect() se completara totalmente
```

La bandera `isCancellationRequested()` se vuelve `true` inmediatamente, mientras que `isCancelled()` solo se vuelve `true` despues de que la corrutina realmente termina.

## Resumen de la Clase

```php
final class Async\Coroutine implements Async\Completable {

    /* Identificacion */
    public getId(): int

    /* Prioridad */
    public asHiPriority(): Coroutine

    /* Contexto */
    public getContext(): Async\Context

    /* Resultado y errores */
    public getResult(): mixed
    public getException(): mixed

    /* Estado */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Control */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Depuracion */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Contenido

- [Coroutine::getId](/es/docs/reference/coroutine/get-id.html) -- Obtener el identificador unico de la corrutina
- [Coroutine::asHiPriority](/es/docs/reference/coroutine/as-hi-priority.html) -- Marcar la corrutina como alta prioridad
- [Coroutine::getContext](/es/docs/reference/coroutine/get-context.html) -- Obtener el contexto local de la corrutina
- [Coroutine::getResult](/es/docs/reference/coroutine/get-result.html) -- Obtener el resultado de ejecucion
- [Coroutine::getException](/es/docs/reference/coroutine/get-exception.html) -- Obtener la excepcion de la corrutina
- [Coroutine::isStarted](/es/docs/reference/coroutine/is-started.html) -- Verificar si la corrutina ha comenzado
- [Coroutine::isQueued](/es/docs/reference/coroutine/is-queued.html) -- Verificar si la corrutina esta en cola
- [Coroutine::isRunning](/es/docs/reference/coroutine/is-running.html) -- Verificar si la corrutina se esta ejecutando actualmente
- [Coroutine::isSuspended](/es/docs/reference/coroutine/is-suspended.html) -- Verificar si la corrutina esta suspendida
- [Coroutine::isCompleted](/es/docs/reference/coroutine/is-completed.html) -- Verificar si la corrutina ha completado
- [Coroutine::isCancelled](/es/docs/reference/coroutine/is-cancelled.html) -- Verificar si la corrutina fue cancelada
- [Coroutine::isCancellationRequested](/es/docs/reference/coroutine/is-cancellation-requested.html) -- Verificar si se solicito cancelacion
- [Coroutine::cancel](/es/docs/reference/coroutine/cancel.html) -- Cancelar la corrutina
- [Coroutine::finally](/es/docs/reference/coroutine/on-finally.html) -- Registrar un manejador de finalizacion
- [Coroutine::getTrace](/es/docs/reference/coroutine/get-trace.html) -- Obtener la pila de llamadas de una corrutina suspendida
- [Coroutine::getSpawnFileAndLine](/es/docs/reference/coroutine/get-spawn-file-and-line.html) -- Obtener el archivo y linea donde se creo la corrutina
- [Coroutine::getSpawnLocation](/es/docs/reference/coroutine/get-spawn-location.html) -- Obtener la ubicacion de creacion como cadena
- [Coroutine::getSuspendFileAndLine](/es/docs/reference/coroutine/get-suspend-file-and-line.html) -- Obtener el archivo y linea donde se suspendio la corrutina
- [Coroutine::getSuspendLocation](/es/docs/reference/coroutine/get-suspend-location.html) -- Obtener la ubicacion de suspension como cadena
- [Coroutine::getAwaitingInfo](/es/docs/reference/coroutine/get-awaiting-info.html) -- Obtener informacion de espera

## Que Sigue

- [Scope](/es/docs/components/scope.html) -- gestion de grupos de corrutinas
- [Cancelacion](/es/docs/components/cancellation.html) -- detalles sobre cancelacion y protect()
- [spawn()](/es/docs/reference/spawn.html) -- documentacion completa
- [await()](/es/docs/reference/await.html) -- documentacion completa
