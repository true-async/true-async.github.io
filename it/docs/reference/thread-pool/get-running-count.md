---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Ottieni il numero di task attualmente in esecuzione nei thread worker."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Restituisce il numero di task attualmente in esecuzione da parte di un thread worker (ovvero prelevati dalla coda e non ancora terminati). Il valore massimo è limitato dal numero di worker. Questo contatore è supportato da una variabile atomica ed è accurato in qualsiasi momento.

## Valore restituito

`int` — numero di task attualmente in esecuzione su tutti i thread worker.

## Esempi

### Esempio #1 Monitorare il conteggio dei task in esecuzione durante l'elaborazione

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

    delay(10); // dare tempo ai worker di avviarsi

    echo "worker: ", $pool->getWorkerCount(), "\n";  // worker: 3
    echo "in esecuzione: ", $pool->getRunningCount(), "\n"; // in esecuzione: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "in esecuzione: ", $pool->getRunningCount(), "\n"; // in esecuzione: 0

    $pool->close();
});
```

## Vedere anche

- [ThreadPool::getPendingCount()](/it/docs/reference/thread-pool/get-pending-count.html) — task in attesa in coda
- [ThreadPool::getCompletedCount()](/it/docs/reference/thread-pool/get-completed-count.html) — task totali completati
- [ThreadPool::getWorkerCount()](/it/docs/reference/thread-pool/get-worker-count.html) — numero di worker
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
