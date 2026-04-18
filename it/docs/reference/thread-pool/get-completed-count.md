---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Ottieni il numero totale di task completati dal pool di thread dalla sua creazione."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Restituisce il numero totale di task eseguiti fino al completamento (con successo o con eccezione) da qualsiasi worker in questo pool dalla sua creazione. Questo contatore è monotonicamente crescente e non si azzera mai. È supportato da una variabile atomica ed è accurato in qualsiasi momento.

Un task viene conteggiato come completato quando il worker termina la sua esecuzione — indipendentemente dal fatto che abbia restituito un valore o lanciato un'eccezione.

## Valore restituito

`int` — numero totale di task completati dalla creazione del pool.

## Esempi

### Esempio #1 Monitoraggio del throughput

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
    echo "completati finora: ", $pool->getCompletedCount(), "\n"; // 0 o più

    foreach ($futures as $f) {
        await($f);
    }

    echo "completati totale: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Vedere anche

- [ThreadPool::getPendingCount()](/it/docs/reference/thread-pool/get-pending-count.html) — task in attesa in coda
- [ThreadPool::getRunningCount()](/it/docs/reference/thread-pool/get-running-count.html) — task attualmente in esecuzione
- [ThreadPool::getWorkerCount()](/it/docs/reference/thread-pool/get-worker-count.html) — numero di worker
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
