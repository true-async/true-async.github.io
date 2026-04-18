---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Obtenir le nombre de tâches en cours d'exécution dans les threads de travail."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Retourne le nombre de tâches en cours d'exécution par un thread de travail (c'est-à-dire récupérées depuis la file et pas encore terminées). La valeur maximale est bornée par le nombre de workers. Ce compteur repose sur une variable atomique et est précis à tout moment.

## Valeur de retour

`int` — nombre de tâches en cours d'exécution sur l'ensemble des threads de travail.

## Exemples

### Exemple #1 Observer le compteur de tâches en cours pendant l'exécution

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

    delay(10); // laisser le temps aux workers de démarrer

    echo "workers : ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "en cours : ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "en cours : ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::getPendingCount()](/fr/docs/reference/thread-pool/get-pending-count.html) — tâches en attente dans la file
- [ThreadPool::getCompletedCount()](/fr/docs/reference/thread-pool/get-completed-count.html) — total des tâches terminées
- [ThreadPool::getWorkerCount()](/fr/docs/reference/thread-pool/get-worker-count.html) — nombre de workers
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
