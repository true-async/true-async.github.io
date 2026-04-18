---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Obtener el número de tareas que se están ejecutando actualmente en los hilos de trabajo."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Devuelve el número de tareas que están siendo ejecutadas actualmente por un hilo de trabajo (es decir, recogidas de la cola y aún no finalizadas). El valor máximo está limitado por el número de trabajadores. Este contador está respaldado por una variable atómica y es preciso en cualquier momento.

## Valor de retorno

`int` — número de tareas en ejecución actualmente en todos los hilos de trabajo.

## Ejemplos

### Ejemplo #1 Observar el conteo de tareas en ejecución mientras se ejecutan

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

    delay(10); // dar tiempo a los trabajadores para arrancar

    echo "trabajadores: ", $pool->getWorkerCount(), "\n";  // trabajadores: 3
    echo "en ejecución: ", $pool->getRunningCount(), "\n"; // en ejecución: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "en ejecución: ", $pool->getRunningCount(), "\n"; // en ejecución: 0

    $pool->close();
});
```

## Véase también

- [ThreadPool::getPendingCount()](/es/docs/reference/thread-pool/get-pending-count.html) — tareas esperando en la cola
- [ThreadPool::getCompletedCount()](/es/docs/reference/thread-pool/get-completed-count.html) — total de tareas completadas
- [ThreadPool::getWorkerCount()](/es/docs/reference/thread-pool/get-worker-count.html) — número de trabajadores
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
