---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Obtenir le nombre de tâches en attente dans la file du pool de threads."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Retourne le nombre de tâches qui ont été soumises mais pas encore prises en charge par un thread de travail. Ce compteur repose sur une variable atomique et est précis à tout moment, même pendant que des workers s'exécutent en parallèle.

## Valeur de retour

`int` — nombre de tâches actuellement en attente dans la file.

## Exemples

### Exemple #1 Observer le vidage de la file

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

    delay(10); // laisser les workers démarrer

    echo "en attente : ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "en attente : ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::getRunningCount()](/fr/docs/reference/thread-pool/get-running-count.html) — tâches en cours d'exécution
- [ThreadPool::getCompletedCount()](/fr/docs/reference/thread-pool/get-completed-count.html) — total des tâches terminées
- [ThreadPool::getWorkerCount()](/fr/docs/reference/thread-pool/get-worker-count.html) — nombre de workers
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
