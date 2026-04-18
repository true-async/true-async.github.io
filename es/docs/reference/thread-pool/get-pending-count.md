---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Obtener el número de tareas esperando en la cola del pool de hilos."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Devuelve el número de tareas que han sido enviadas pero aún no recogidas por un hilo de trabajo. Este contador está respaldado por una variable atómica y es preciso en cualquier momento, incluso mientras los trabajadores se ejecutan en paralelo.

## Valor de retorno

`int` — número de tareas que esperan actualmente en la cola.

## Ejemplos

### Ejemplo #1 Observar el vaciado de la cola

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // dejar que los trabajadores arranquen

    echo "pendientes: ", $pool->getPendingCount(), "\n"; // pendientes: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pendientes: ", $pool->getPendingCount(), "\n"; // pendientes: 0

    $pool->close();
});
```

## Véase también

- [ThreadPool::getRunningCount()](/es/docs/reference/thread-pool/get-running-count.html) — tareas en ejecución actualmente
- [ThreadPool::getCompletedCount()](/es/docs/reference/thread-pool/get-completed-count.html) — total de tareas completadas
- [ThreadPool::getWorkerCount()](/es/docs/reference/thread-pool/get-worker-count.html) — número de trabajadores
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
