---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Arrêter gracieusement le pool de threads en attendant que toutes les tâches en file et en cours se terminent."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Initie un arrêt gracieux du pool. Après l'appel à `close()` :

- Tout appel ultérieur à `submit()` lève immédiatement une `Async\ThreadPoolException`.
- Les tâches déjà dans la file continuent et se terminent normalement.
- Les tâches en cours d'exécution dans les threads de travail se terminent normalement.
- La méthode bloque la coroutine appelante jusqu'à ce que toutes les tâches en cours soient terminées et que tous les workers se soient arrêtés.

Pour un arrêt immédiat et forcé qui abandonne les tâches en file, utilisez plutôt [`cancel()`](/fr/docs/reference/thread-pool/cancel.html).

## Valeur de retour

`void`

## Exemples

### Exemple #1 Arrêt gracieux après la soumission de toutes les tâches

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // attend que la tâche ci-dessus se termine

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Exemple #2 Soumettre après close lève une exception

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Erreur : ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## Voir aussi

- [ThreadPool::cancel()](/fr/docs/reference/thread-pool/cancel.html) — arrêt forcé
- [ThreadPool::isClosed()](/fr/docs/reference/thread-pool/is-closed.html) — vérifier si le pool est fermé
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
