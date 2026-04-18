---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Obtener el número total de tareas completadas por el pool de hilos desde su creación."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Devuelve el número total de tareas que han sido ejecutadas hasta su finalización (de forma exitosa o con excepción) por cualquier trabajador en este pool desde que se creó el pool. Este contador es monotónicamente creciente y nunca se reinicia. Está respaldado por una variable atómica y es preciso en cualquier momento.

Una tarea se cuenta como completada cuando el trabajador termina de ejecutarla, independientemente de si devolvió un valor o lanzó una excepción.

## Valor de retorno

`int` — número total de tareas completadas desde la creación del pool.

## Ejemplos

### Ejemplo #1 Seguimiento del rendimiento

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10);
    echo "completadas hasta ahora: ", $pool->getCompletedCount(), "\n"; // 0 o más

    foreach ($futures as $f) {
        await($f);
    }

    echo "completadas en total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Véase también

- [ThreadPool::getPendingCount()](/es/docs/reference/thread-pool/get-pending-count.html) — tareas esperando en la cola
- [ThreadPool::getRunningCount()](/es/docs/reference/thread-pool/get-running-count.html) — tareas en ejecución actualmente
- [ThreadPool::getWorkerCount()](/es/docs/reference/thread-pool/get-worker-count.html) — número de trabajadores
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
