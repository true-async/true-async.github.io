---
layout: docs
lang: es
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /es/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — un pool de hilos de trabajo para la ejecución paralela de tareas limitadas por CPU en TrueAsync."
---

# Async\ThreadPool: pool de hilos de trabajo

## Por qué ThreadPool

[`spawn_thread()`](/es/docs/reference/spawn-thread.html) resuelve el problema "una tarea — un hilo":
lanzar un cálculo pesado, esperar el resultado, el hilo termina. Esto es conveniente, pero tiene un
costo: **cada lanzamiento de hilo es una llamada completa al sistema**. Inicializar un entorno PHP separado,
cargar bytecode de Opcache, asignar una pila — todo esto ocurre desde cero. Con cientos o
miles de tales tareas, la sobrecarga se vuelve notable.

`Async\ThreadPool` resuelve este problema: al inicio, se crea un conjunto fijo de **hilos de trabajo**
(hilos del SO con su propio entorno PHP) que viven durante toda la vida del programa
y se **reutilizan repetidamente** para ejecutar tareas. Cada `submit()` coloca una tarea en la cola, un
trabajador libre la recoge, la ejecuta, y devuelve el resultado mediante [`Async\Future`](/es/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Enviar 8 tareas a un pool de 4 trabajadores
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

Ocho tareas se ejecutan en paralelo en cuatro trabajadores. Mientras los trabajadores calculan — el programa principal
(otras corrutinas) continúa ejecutándose: `await($f)` suspende solo la corrutina que espera, no
el proceso completo.

## Cuándo usar ThreadPool vs spawn_thread o corrutinas

| Escenario                                                        | Herramienta              |
|------------------------------------------------------------------|--------------------------|
| Una tarea pesada, lanzada raramente                              | `spawn_thread()`         |
| Muchas tareas cortas de CPU en un bucle                          | `ThreadPool`             |
| Un hilo fijo que vive durante todo el programa                   | `ThreadPool`             |
| I/O: red, base de datos, sistema de archivos                     | Corrutinas               |
| Tarea necesaria inmediatamente, sin cola                         | `spawn_thread()`         |

**Regla clave:** si las tareas son muchas y cortas — un pool amortigua el costo de inicio del hilo.
Si hay una sola tarea lanzada cada pocos segundos — `spawn_thread()` es suficiente.

Un tamaño típico de pool es igual al número de núcleos físicos de CPU (`nproc` en Linux, `sysconf(_SC_NPROCESSORS_ONLN)`
en C). Más trabajadores que núcleos no acelera las cargas de trabajo limitadas por CPU y solo añade sobrecarga de cambio de contexto.

## Creación de un pool

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Parámetro    | Tipo  | Propósito                                                             | Valor por defecto |
|--------------|-------|-----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Número de hilos de trabajo. Todos inician cuando se crea el pool      | **requerido**     |
| `$queueSize` | `int` | Longitud máxima de la cola de tareas pendientes                       | `workers × 4`     |

Todos los hilos de trabajo inician **inmediatamente al crear** el pool — `new ThreadPool(4)` crea cuatro
hilos de inmediato. Esta es una pequeña inversión "por adelantado", pero las llamadas posteriores a `submit()` no tienen
sobrecarga de inicio de hilo.

`$queueSize` limita el tamaño de la cola interna de tareas. Si la cola está llena (todos los trabajadores están ocupados
y ya hay `$queueSize` tareas en la cola), el siguiente `submit()` **suspende la corrutina llamante**
hasta que un trabajador esté disponible. Un valor de cero significa `workers × 4`.

## Envío de tareas

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Agrega una tarea a la cola del pool. Devuelve un [`Async\Future`](/es/docs/components/future.html)
que:

- **resuelve** con el valor de `return` de `$task` cuando el trabajador termina la ejecución;
- **rechaza** con una excepción si `$task` lanzó una excepción.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Tarea sin argumentos
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Tarea con argumentos — los argumentos también se pasan por valor (copia profunda)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### Manejo de excepciones de una tarea

Si una tarea lanza una excepción, el `Future` es rechazado, y `await()` la relanza en la
corrutina llamante:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### Reglas de transferencia de datos

La tarea (`$task`) y todos los `...$args` se **copian profundamente** en el hilo de trabajo — las mismas reglas
que con `spawn_thread()`. No se puede pasar `stdClass`, referencias PHP (`&$var`) o recursos; intentar
hacerlo hará que el origen lance `Async\ThreadTransferException`. Más detalles:
[«Transferencia de datos entre hilos»](/es/docs/components/threads.html#transferencia-de-datos-entre-hilos).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Aplica `$task` a cada elemento de `$items` en paralelo usando los trabajadores del pool. **Bloquea** la
corrutina llamante hasta que todas las tareas se completen. Devuelve un array de resultados en el mismo orden que los
datos de entrada.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

Si al menos una tarea lanza una excepción, `map()` la relanza en la corrutina llamante.
El orden de los resultados siempre coincide con el orden de los elementos de entrada, independientemente del orden en que
los trabajadores terminen.

## Monitoreo del estado del pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Lanzar varias tareas
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Simular trabajo
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Verificar contadores mientras las tareas están ejecutándose
    delay(50); // dar tiempo a los trabajadores para iniciar
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| Método                | Qué devuelve                                                                            |
|-----------------------|-----------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Número de hilos de trabajo (establecido en el constructor)                              |
| `getPendingCount()`   | Tareas en la cola, aún no recogidas por un trabajador                                   |
| `getRunningCount()`   | Tareas que actualmente está ejecutando un trabajador                                    |
| `getCompletedCount()` | Total de tareas completadas desde que se creó el pool (monotónicamente creciente)       |
| `isClosed()`          | `true` si el pool ha sido cerrado mediante `close()` o `cancel()`                       |

Los contadores se implementan como variables atómicas — son precisos en cualquier momento, incluso
cuando los trabajadores están ejecutándose en hilos paralelos.

## Apagado del pool

Los hilos de trabajo viven hasta que el pool sea detenido explícitamente. Siempre llama `close()`
o `cancel()` cuando hayas terminado — de lo contrario los hilos continuarán ejecutándose hasta el final del proceso.

### close() — apagado controlado

```php
$pool->close();
```

Después de llamar `close()`:

- Las nuevas llamadas a `submit()` lanzan inmediatamente `Async\ThreadPoolException`.
- Las tareas ya en la cola o siendo ejecutadas por trabajadores **se completan normalmente**.
- El método solo retorna después de que todas las tareas en progreso hayan terminado y todos los trabajadores se hayan detenido.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // Garantizado para obtener el resultado

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — apagado forzado

```php
$pool->cancel();
```

Después de llamar `cancel()`:

- Las nuevas llamadas a `submit()` lanzan `Async\ThreadPoolException`.
- Las tareas en la cola (aún no recogidas por un trabajador) son **rechazadas inmediatamente** — los objetos
  `Future` correspondientes pasan al estado "rechazado".
- Las tareas que ya están siendo ejecutadas por trabajadores **se ejecutan hasta completar** la iteración actual (interrumpir
  forzosamente código PHP dentro de un hilo no es posible).
- Los trabajadores se detienen inmediatamente después de terminar la tarea actual y no recogen nuevas.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Llenar la cola con tareas
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Cancelar inmediatamente — las tareas en la cola serán rechazadas
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### Comparación de close() y cancel()

| Aspecto                             | `close()`                            | `cancel()`                              |
|-------------------------------------|--------------------------------------|-----------------------------------------|
| Nuevas llamadas a submit()          | Lanza `ThreadPoolException`          | Lanza `ThreadPoolException`             |
| Tareas en la cola                   | Se ejecutan normalmente              | Rechazadas inmediatamente               |
| Tareas actualmente en ejecución     | Se completan normalmente             | Se completan normalmente (iteración actual) |
| Cuándo se detienen los trabajadores | Tras vaciar la cola                  | Tras completar la tarea actual          |

## Pasar un pool entre hilos

El objeto `ThreadPool` es en sí mismo seguro para hilos: puede pasarse a `spawn_thread()` mediante `use()`,
y cualquier hilo puede llamar `submit()` en el mismo pool.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Crear el pool una vez en el hilo principal
    $pool = new ThreadPool(workers: 4);

    // Lanzar un hilo del SO que también usará el pool
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

Esto permite arquitecturas donde múltiples hilos del SO o corrutinas **comparten un único pool**,
enviando tareas a él de forma independiente entre sí.

## Ejemplo completo: procesamiento paralelo de imágenes

El pool se crea una vez. Cada trabajador recibe una ruta de archivo, abre la imagen mediante GD,
la reduce a las dimensiones especificadas, la convierte a escala de grises y la guarda en el directorio de salida.
El hilo principal recopila los resultados a medida que están listos.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Esta función se ejecuta en un hilo de trabajo.
// Las operaciones GD son limitadas por CPU — exactamente el tipo de tareas que se benefician de los hilos.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Abrir origen
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Redimensionar preservando la relación de aspecto
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Convertir a escala de grises
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Guardar en el directorio de salida
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // Lista de archivos a procesar
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() preserva el orden — results[i] corresponde a files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## Ver también

- [`spawn_thread()`](/es/docs/reference/spawn-thread.html) — lanzar una sola tarea en un hilo separado
- [`Async\Thread`](/es/docs/components/threads.html) — hilos del SO y reglas de transferencia de datos
- [`Async\ThreadChannel`](/es/docs/components/thread-channels.html) — canales seguros para hilos
- [`Async\Future`](/es/docs/components/future.html) — esperar el resultado de una tarea
