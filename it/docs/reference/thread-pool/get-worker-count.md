---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Ottieni il numero di thread worker nel pool di thread."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Restituisce il numero di thread worker attualmente in esecuzione nel pool. Parte dall'argomento `$workers` passato a [`new ThreadPool()`](/it/docs/reference/thread-pool/__construct.html) e diminuisce man mano che i worker terminano.

## Valore restituito

`int` — numero di thread worker attualmente in esecuzione. Un worker esce dal conteggio quando il suo thread termina, quindi un pool chiuso riporta 0 una volta che i suoi worker si sono esauriti, e un pool che ha perso un thread riporta un'unità in meno rispetto a quella con cui è stato costruito.

## Esempi

### Esempio #1 Verifica del numero di worker

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

### Esempio #2 Dimensionamento del pool in base ai core CPU disponibili

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool creato con ", $pool->getWorkerCount(), " worker\n";

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

## Vedere anche

- [ThreadPool::getPendingCount()](/it/docs/reference/thread-pool/get-pending-count.html) — task in attesa in coda
- [ThreadPool::getRunningCount()](/it/docs/reference/thread-pool/get-running-count.html) — task attualmente in esecuzione
- [ThreadPool::getCompletedCount()](/it/docs/reference/thread-pool/get-completed-count.html) — task totali completati
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
