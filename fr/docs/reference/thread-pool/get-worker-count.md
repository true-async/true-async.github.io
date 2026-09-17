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

Retourne le nombre de threads de travail actuellement actifs dans le pool. Il démarre à la valeur de l'argument `$workers` passé à [`new ThreadPool()`](/fr/docs/reference/thread-pool/__construct.html) et diminue à mesure que les threads de travail se terminent.

## Valeur de retour

`int` — nombre de threads de travail actuellement actifs. Un thread de travail sort du compte quand il se termine, donc un pool fermé indique 0 une fois que ses threads de travail ont fini, et un pool ayant perdu un thread indique un de moins qu'à sa construction.

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
