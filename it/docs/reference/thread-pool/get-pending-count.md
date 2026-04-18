---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Ottieni il numero di task in attesa nella coda del pool di thread."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Restituisce il numero di task che sono stati inviati ma non ancora prelevati da un thread worker. Questo contatore è supportato da una variabile atomica ed è accurato in qualsiasi momento, anche mentre i worker sono in esecuzione in parallelo.

## Valore restituito

`int` — numero di task attualmente in attesa nella coda.

## Esempi

### Esempio #1 Osservare lo svuotamento della coda

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

    delay(10); // lasciare tempo ai worker di avviarsi

    echo "in attesa: ", $pool->getPendingCount(), "\n"; // in attesa: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "in attesa: ", $pool->getPendingCount(), "\n"; // in attesa: 0

    $pool->close();
});
```

## Vedere anche

- [ThreadPool::getRunningCount()](/it/docs/reference/thread-pool/get-running-count.html) — task attualmente in esecuzione
- [ThreadPool::getCompletedCount()](/it/docs/reference/thread-pool/get-completed-count.html) — task totali completati
- [ThreadPool::getWorkerCount()](/it/docs/reference/thread-pool/get-worker-count.html) — numero di worker
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
