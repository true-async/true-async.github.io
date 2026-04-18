---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Arrêt forcé du pool de threads, rejetant immédiatement toutes les tâches en file."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Initie un arrêt forcé du pool. Après l'appel à `cancel()` :

- Tout appel ultérieur à `submit()` lève immédiatement une `Async\ThreadPoolException`.
- Les tâches en attente dans la file (pas encore prises en charge par un worker) sont **immédiatement rejetées** — leurs objets `Future` correspondants passent à l'état rejeté avec une `ThreadPoolException`.
- Les tâches déjà en cours d'exécution dans les threads de travail s'exécutent jusqu'à la fin de la tâche en cours (interrompre de force du code PHP dans un thread n'est pas possible).
- Les workers s'arrêtent dès qu'ils terminent la tâche en cours et ne prennent plus aucune nouvelle tâche dans la file.

Pour un arrêt gracieux qui laisse toutes les tâches en file se terminer, utilisez plutôt [`close()`](/fr/docs/reference/thread-pool/close.html).

## Valeur de retour

`void`

## Exemples

### Exemple #1 Annulation forcée avec des tâches en file

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Remplir la file avec 8 tâches réparties sur 2 workers
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Annulation immédiate — les tâches en file sont rejetées
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (déjà en cours d'exécution lors de cancel())
    echo "cancelled: $cancelled\n"; // 6  (encore dans la file)
});
```

## Voir aussi

- [ThreadPool::close()](/fr/docs/reference/thread-pool/close.html) — arrêt gracieux
- [ThreadPool::isClosed()](/fr/docs/reference/thread-pool/is-closed.html) — vérifier si le pool est fermé
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant et comparaison close() vs cancel()
