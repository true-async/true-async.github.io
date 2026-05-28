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
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

Crée un nouveau pool de threads et démarre immédiatement tous les threads de travail. Les workers
restent actifs pendant toute la durée de vie du pool, éliminant le surcoût de démarrage de thread
par tâche.

## Paramètres

| Paramètre      | Type          | Description                                                                                                                                                                                                                                |
|----------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`         | Nombre de threads de travail. `0` (défaut) : autodétection via [`Async\available_parallelism()`](/fr/docs/reference/available-parallelism.html).                                                                                            |
| `$queueSize`   | `int`         | Longueur maximale de la file d'attente. `0` (défaut) : `workers × 4`. Quand la file est pleine, `submit()` suspend la coroutine appelante jusqu'à ce qu'un emplacement se libère.                                                          |
| `$bootloader`  | `?\Closure`   | Initialisation de démarrage par worker. La closure est deep-copy'ée une fois et exécutée dans chaque worker **avant** la boucle principale. Pratique pour l'autoload, le warmup des pools de connexions, la précompilation opcache. Si le bootloader lève une exception, tout le pool est considéré comme en échec. |
| `$coroutine`   | `bool`        | Si `true` : chaque tâche démarre **comme une coroutine** dans son scope enfant, imbriqué dans le scope commun du worker. À l'intérieur de la tâche, on peut `await`, utiliser des channels, des E/S et `spawn` — tout sans bloquer le thread OS. |
| `$concurrency` | `int`         | Limite de coroutines vivantes simultanément dans un worker. Utilisé seulement avec `coroutine: true`. `0` (défaut) : sans limite.                                                                                                          |

## Exceptions

Lève `\ValueError` si `$workers < 0` ou `$queueSize < 0`.

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

### Exemple #3 Bootloader — initialisation de démarrage du worker

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... les submit verront un environnement entièrement initialisé ...

    $pool->close();
});
```

### Exemple #4 Mode coroutine — on peut faire `await` à l'intérieur d'une tâche

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // l'appel bloquant habituel parque correctement la coroutine
        // au lieu de bloquer le thread OS du worker
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Exemple #5 Autodétection du nombre de workers selon les CPU disponibles

```php
<?php

use Async\ThreadPool;

// workers: 0 (défaut) → Async\available_parallelism()
$pool = new ThreadPool();   // prend en compte le quota cgroup / l'affinity du conteneur
```

## Voir aussi

- [ThreadPool::submit()](/fr/docs/reference/thread-pool/submit.html) — ajouter une tâche au pool
- [ThreadPool::close()](/fr/docs/reference/thread-pool/close.html) — arrêt gracieux
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
- [`spawn_thread()`](/fr/docs/reference/spawn-thread.html) — thread ponctuel pour une seule tâche
