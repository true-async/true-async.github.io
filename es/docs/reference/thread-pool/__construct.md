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
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Crea un nuevo pool de hilos e inicia todos los hilos de trabajo de inmediato. Los trabajadores permanecen activos durante toda la vida útil del pool, eliminando la sobrecarga de inicio de hilo por tarea.

## Parámetros

| Parámetro    | Tipo  | Descripción                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Número de hilos de trabajo a crear. Debe ser ≥ 1. Todos los hilos se inician en el momento de la construcción. |
| `$queueSize` | `int` | Número máximo de tareas que pueden esperar en la cola. `0` (predeterminado) significa `$workers × 4`. Cuando la cola está llena, `submit()` suspende la corrutina llamante hasta que haya un slot disponible. |

## Excepciones

Lanza `\ValueError` si `$workers < 1`.

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

## Véase también

- [ThreadPool::submit()](/es/docs/reference/thread-pool/submit.html) — agregar una tarea al pool
- [ThreadPool::close()](/es/docs/reference/thread-pool/close.html) — apagado gracioso
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
- [`spawn_thread()`](/es/docs/reference/spawn-thread.html) — hilo único para una sola tarea
