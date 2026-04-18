---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Obtenir le nombre de threads de travail dans le pool de threads."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Retourne le nombre de threads de travail dans le pool. Cette valeur est fixée à la construction et ne change pas pendant la durée de vie du pool. Elle est égale à l'argument `$workers` passé à [`new ThreadPool()`](/fr/docs/reference/thread-pool/__construct.html).

## Valeur de retour

`int` — nombre de threads de travail (tel que défini dans le constructeur).

## Exemples

### Exemple #1 Confirmer le nombre de workers

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

### Exemple #2 Dimensionner le pool selon les cœurs CPU disponibles

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool créé avec ", $pool->getWorkerCount(), " workers\n";

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

## Voir aussi

- [ThreadPool::getPendingCount()](/fr/docs/reference/thread-pool/get-pending-count.html) — tâches en attente dans la file
- [ThreadPool::getRunningCount()](/fr/docs/reference/thread-pool/get-running-count.html) — tâches en cours d'exécution
- [ThreadPool::getCompletedCount()](/fr/docs/reference/thread-pool/get-completed-count.html) — total des tâches terminées
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
