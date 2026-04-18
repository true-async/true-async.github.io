---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Créer un nouveau ThreadPool avec un nombre fixe de threads de travail."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Crée un nouveau pool de threads et démarre immédiatement tous les threads de travail. Les workers restent actifs pendant toute la durée de vie du pool, éliminant ainsi le surcoût de démarrage de thread par tâche.

## Paramètres

| Paramètre    | Type  | Description                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Nombre de threads de travail à créer. Doit être ≥ 1. Tous les threads démarrent au moment de la construction. |
| `$queueSize` | `int` | Nombre maximum de tâches pouvant attendre dans la file. `0` (par défaut) signifie `$workers × 4`. Lorsque la file est pleine, `submit()` suspend la coroutine appelante jusqu'à ce qu'un emplacement se libère. |

## Exceptions

Lève une `\ValueError` si `$workers < 1`.

## Exemples

### Exemple #1 Création basique d'un pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 workers, taille de la file par défaut : 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Exemple #2 Taille de file explicite

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 workers, file limitée à 64 tâches en attente
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... soumettre des tâches ...

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::submit()](/fr/docs/reference/thread-pool/submit.html) — ajouter une tâche au pool
- [ThreadPool::close()](/fr/docs/reference/thread-pool/close.html) — arrêt gracieux
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
- [`spawn_thread()`](/fr/docs/reference/spawn-thread.html) — thread ponctuel pour une seule tâche
