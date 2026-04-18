---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Obtenir le nombre total de tâches terminées par le pool de threads depuis sa création."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Retourne le nombre total de tâches qui ont été exécutées jusqu'à leur terme (avec succès ou avec une exception) par n'importe quel worker de ce pool depuis la création du pool. Ce compteur est monotoniquement croissant et ne se réinitialise jamais. Il repose sur une variable atomique et est précis à tout moment.

Une tâche est comptabilisée comme terminée lorsque le worker finit de l'exécuter — qu'elle ait retourné une valeur ou levé une exception.

## Valeur de retour

`int` — nombre total de tâches terminées depuis la création du pool.

## Exemples

### Exemple #1 Suivi du débit

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
    echo "terminées jusqu'à présent : ", $pool->getCompletedCount(), "\n"; // 0 ou plus

    foreach ($futures as $f) {
        await($f);
    }

    echo "terminées au total : ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::getPendingCount()](/fr/docs/reference/thread-pool/get-pending-count.html) — tâches en attente dans la file
- [ThreadPool::getRunningCount()](/fr/docs/reference/thread-pool/get-running-count.html) — tâches en cours d'exécution
- [ThreadPool::getWorkerCount()](/fr/docs/reference/thread-pool/get-worker-count.html) — nombre de workers
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
