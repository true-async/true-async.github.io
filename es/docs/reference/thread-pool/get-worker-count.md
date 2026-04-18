---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Obtener el número de hilos de trabajo en el pool de hilos."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Devuelve el número de hilos de trabajo en el pool. Este valor se fija en el momento de la construcción y no cambia durante la vida útil del pool. Es igual al argumento `$workers` pasado a [`new ThreadPool()`](/es/docs/reference/thread-pool/__construct.html).

## Valor de retorno

`int` — número de hilos de trabajo (tal como se definió en el constructor).

## Ejemplos

### Ejemplo #1 Confirmar el conteo de trabajadores

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    echo $pool->getWorkerCount(), "\n"; // 4

    $pool->close();
});
```

### Ejemplo #2 Dimensionar el pool según los núcleos de CPU disponibles

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool creado con ", $pool->getWorkerCount(), " trabajadores\n";

    $futures = [];
    for ($i = 0; $i < $cores * 2; $i++) {
        $futures[] = $pool->submit(fn() => 'done');
    }
    foreach ($futures as $f) {
        await($f);
    }

    $pool->close();
});
```

## Véase también

- [ThreadPool::getPendingCount()](/es/docs/reference/thread-pool/get-pending-count.html) — tareas esperando en la cola
- [ThreadPool::getRunningCount()](/es/docs/reference/thread-pool/get-running-count.html) — tareas en ejecución actualmente
- [ThreadPool::getCompletedCount()](/es/docs/reference/thread-pool/get-completed-count.html) — total de tareas completadas
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
