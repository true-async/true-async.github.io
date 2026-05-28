---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Crear un nuevo ThreadPool con un número fijo de hilos de trabajo."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

Crea un nuevo pool de hilos e inicia todos los hilos de trabajo de inmediato. Los trabajadores permanecen activos durante toda la vida útil del pool, eliminando la sobrecarga de inicio de hilo por tarea.

## Parámetros

| Parámetro      | Tipo         | Descripción                                                                                                       |
|----------------|--------------|-------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`        | Número de hilos de trabajo. `0` (por defecto) — autodetección mediante [`Async\available_parallelism()`](/es/docs/reference/available-parallelism.html). |
| `$queueSize`   | `int`        | Longitud máxima de la cola de tareas pendientes. `0` (por defecto) — `workers × 4`. Cuando la cola está llena, `submit()` suspende la corrutina llamante hasta que haya un slot disponible. |
| `$bootloader`  | `?\Closure`  | Inicialización de arranque del worker. La closure se deep-copia una vez y se ejecuta en cada worker **antes** del bucle principal de procesamiento de tareas. Cómodo para autoload, calentamiento de pools de conexiones y precompilación de opcache. Si el bootloader lanza una excepción, el pool entero se considera fallido. |
| `$coroutine`   | `bool`       | Si es `true`, cada tarea se lanza **como corrutina** en su propio scope hijo, anidado dentro del scope común del pool del worker. Dentro de la tarea puedes hacer `await`, usar channels, E/S y `spawn`, todo sin bloquear al hilo del SO. |
| `$concurrency` | `int`        | Límite de corrutinas vivas concurrentemente dentro de un mismo worker. Se usa solo con `coroutine: true`. `0` (por defecto): sin límite. |

## Excepciones

Lanza `\ValueError` si `$workers < 0` o `$queueSize < 0`.

## Ejemplos

### Ejemplo #1 Creación básica del pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 trabajadores, tamaño de cola por defecto es 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hola desde el trabajador');
    echo await($future), "\n"; // hola desde el trabajador

    $pool->close();
});
```

### Ejemplo #2 Tamaño de cola explícito

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 trabajadores, cola limitada a 64 tareas pendientes
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... enviar tareas ...

    $pool->close();
});
```

### Ejemplo #3 Bootloader — inicialización de arranque del worker

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... las tareas que se envíen verán un entorno totalmente inicializado ...

    $pool->close();
});
```

### Ejemplo #4 Modo corrutinas — dentro de la tarea se puede hacer await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // una llamada bloqueante habitual aparca correctamente la corrutina
        // en vez de bloquear el hilo del SO del worker
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Ejemplo #5 Autodetección del número de workers según las CPUs disponibles

```php
<?php

use Async\ThreadPool;

// workers: 0 (por defecto) → Async\available_parallelism()
$pool = new ThreadPool();   // tiene en cuenta la cuota de cgroup del contenedor / affinity
```

## Véase también

- [ThreadPool::submit()](/es/docs/reference/thread-pool/submit.html) — agregar una tarea al pool
- [ThreadPool::close()](/es/docs/reference/thread-pool/close.html) — apagado gracioso
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
- [`spawn_thread()`](/es/docs/reference/spawn-thread.html) — hilo único para una sola tarea
