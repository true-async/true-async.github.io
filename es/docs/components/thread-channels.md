---
layout: docs
lang: es
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /es/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — un canal seguro para hilos para pasar datos entre hilos del sistema operativo en TrueAsync."
---

# Async\ThreadChannel: canales entre hilos del sistema operativo

## En qué se diferencia de un Channel normal

`Async\Channel` funciona **dentro de un único hilo** — entre corrutinas del mismo scheduler. Sus datos viven en **memoria local del hilo**, y la seguridad está garantizada por el hecho de que solo una corrutina accede al canal a la vez.

`Async\ThreadChannel` está diseñado para pasar datos **entre hilos del sistema operativo**. El búfer del canal vive en **memoria compartida** accesible a todos los hilos, no en la memoria de ningún hilo individual. Cada valor enviado se copia en profundidad en esa memoria compartida, y en el lado receptor — de vuelta a la memoria local del hilo. La sincronización se realiza mediante un mutex seguro para hilos, por lo que `send()` y `recv()` pueden llamarse desde diferentes hilos del SO de forma concurrente.

| Propiedad                              | `Async\Channel`                            | `Async\ThreadChannel`                              |
|----------------------------------------|--------------------------------------------|----------------------------------------------------|
| Ámbito                                 | Un único hilo del SO                       | Entre hilos del SO                                 |
| Dónde viven los datos en búfer         | Memoria local del hilo                     | Memoria compartida visible para todos los hilos    |
| Sincronización                         | Scheduler de corrutinas (cooperativo)      | Mutex (seguro para hilos)                          |
| Rendezvous (capacidad=0)               | Soportado                                  | No — siempre con búfer                             |
| Capacidad mínima                       | 0                                          | 1                                                  |

Si todo se ejecuta en un único hilo — use `Async\Channel`, es más ligero. `ThreadChannel` tiene sentido solo cuando genuinamente necesita intercambio de datos entre hilos del SO.

## Creando un canal

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — tamaño del búfer (mínimo `1`). Valores más grandes absorben mejor las ráfagas de productores, pero consumen más memoria para la cola activa.

## Ejemplo básico: productor + consumidor

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Productor — un hilo del SO separado
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Consumidor — en el hilo principal (una corrutina)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "recibido: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "canal cerrado\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

El productor escribe en el canal desde un hilo separado; el hilo principal lee mediante `recv()` — nada especial, se ve igual que un `Channel` normal.

## send / recv

### `send($value[, $cancellation])`

Envía un valor al canal. Si el búfer está lleno — **suspende la corrutina actual** (suspensión cooperativa — otras corrutinas en este scheduler siguen ejecutándose) hasta que otro hilo libere espacio.

El valor se **copia en profundidad en la memoria compartida del canal** siguiendo las mismas reglas que las variables capturadas mediante `use(...)` en `spawn_thread()`. Los objetos con propiedades dinámicas, referencias PHP y recursos son rechazados con `Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // array
$ch->send(new Point(3, 4));                    // objeto con props declaradas
$ch->send($futureState);                       // Async\FutureState (¡una vez!)
```

Si el canal ya está cerrado — `send()` lanza `Async\ThreadChannelException`.

### `recv([$cancellation])`

Lee un valor del canal. Si el búfer está vacío — suspende la corrutina actual hasta que lleguen datos **o** el canal se cierre.

- Si llegan datos — devuelve el valor.
- Si el canal está cerrado y el búfer está vacío — lanza `Async\ThreadChannelException`.
- Si el canal está cerrado pero el búfer todavía tiene elementos — **drena los datos restantes primero**, lanzando `ThreadChannelException` solo cuando el búfer está vacío.

Esto permite drenar correctamente un canal después de cerrarlo.

## Estado del canal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| Método         | Devuelve                                              |
|----------------|-------------------------------------------------------|
| `capacity()`   | Tamaño del búfer establecido en el constructor        |
| `count()`      | Número actual de mensajes en el búfer                 |
| `isEmpty()`    | `true` si el búfer está vacío                         |
| `isFull()`     | `true` si el búfer está lleno hasta la capacidad      |
| `isClosed()`   | `true` si el canal ha sido cerrado                    |

`ThreadChannel` implementa `Countable`, por lo que `count($ch)` funciona.

## close()

```php
$ch->close();
```

Tras el cierre:

- `send()` lanza inmediatamente `Async\ThreadChannelException`.
- `recv()` **drena los valores restantes**, luego comienza a lanzar `ThreadChannelException`.
- Todas las corrutinas/hilos suspendidos en `send()` o `recv()` son **despertados** con `ThreadChannelException`.

Un canal solo puede cerrarse una vez. Una llamada repetida es una operación segura sin efecto.

## Patrón: pool de workers

Dos canales — uno para trabajos, otro para resultados. Los hilos worker leen trabajos del primero y ponen resultados en el segundo.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 hilos worker
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Simular carga de CPU
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // canal jobs cerrado — el worker termina
            }
        });
    }

    // Despachar 6 trabajos
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Esperar a que todos los hilos worker terminen
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Drenar resultados
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Cada worker procesó 2 trabajos — la carga se distribuyó entre tres hilos.

### Nota sobre la distribución

Si el productor escribe en el canal más rápido de lo que los workers leen (o si los workers gastan casi nada de tiempo de CPU), **el primer worker puede tomar todos los trabajos** inmediatamente, porque su `recv()` se despierta primero y recoge el siguiente mensaje antes de que los otros workers lleguen a su `recv()`. Este es el comportamiento normal para una cola concurrente — no se garantiza una planificación equitativa.

Si se requiere uniformidad estricta — particionar las tareas de antemano (shard-by-hash), o dar a cada worker su propio canal dedicado.

## Pasando datos complejos a través del canal

`ThreadChannel` puede transportar cualquier cosa que soporte la transferencia de datos entre hilos (ver [Pasando datos entre hilos](/es/docs/components/threads.html#passing-data-between-threads)):

- escalares, arrays, objetos con propiedades declaradas
- `Closure` (closures)
- `WeakReference` y `WeakMap` (con las mismas reglas de propietario fuerte que en `spawn_thread`)
- `Async\FutureState` (una vez)

Cada llamada a `send()` es una operación independiente con su propia tabla de identidad. **La identidad se preserva dentro de un único mensaje**, pero no entre llamadas `send()` separadas. Si quiere que dos receptores vean el "mismo" objeto — envíelo una vez dentro de un array, no como dos mensajes separados.

## Limitaciones

- **La capacidad mínima es 1.** Rendezvous (capacidad=0) no está soportado, a diferencia de `Async\Channel`.
- **`ThreadChannel` no soporta serialización.** Los objetos de canal no pueden guardarse en un archivo o enviarse por la red — un canal existe solo dentro de un proceso activo.
- **Un manejador de canal puede pasarse** mediante `spawn_thread` o anidado dentro de otro canal — el manejador de objeto para `ThreadChannel` se transfiere correctamente, y ambos lados ven el mismo búfer interno.

## Ver también

- [`Async\Thread`](/es/docs/components/threads.html) — hilos del SO en TrueAsync
- [`spawn_thread()`](/es/docs/reference/spawn-thread.html) — iniciar un closure en un nuevo hilo
- [`Async\Channel`](/es/docs/components/channels.html) — canales entre corrutinas en el mismo hilo
