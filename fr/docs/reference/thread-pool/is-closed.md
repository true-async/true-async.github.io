---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Vérifier si le pool de threads a été arrêté."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Retourne `true` si le pool a été arrêté via [`close()`](/fr/docs/reference/thread-pool/close.html) ou [`cancel()`](/fr/docs/reference/thread-pool/cancel.html). Retourne `false` tant que le pool accepte encore des tâches.

## Valeur de retour

`bool` — `true` si le pool est fermé ; `false` s'il est encore actif.

## Exemples

### Exemple #1 Vérifier l'état avant de soumettre

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### Exemple #2 Protéger submit dans des contextes partagés

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## Voir aussi

- [ThreadPool::close()](/fr/docs/reference/thread-pool/close.html) — arrêt gracieux
- [ThreadPool::cancel()](/fr/docs/reference/thread-pool/cancel.html) — arrêt forcé
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
