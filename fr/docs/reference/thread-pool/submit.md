---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Soumettre une tâche au pool de threads et recevoir un Future pour son résultat."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Ajoute une tâche à la file interne du pool. Un worker disponible la récupère, l'exécute et résout le `Future` retourné avec la valeur de retour. Si la file est pleine, la coroutine appelante est suspendue jusqu'à ce qu'un emplacement se libère.

## Paramètres

| Paramètre | Type       | Description                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | Le callable à exécuter dans un thread de travail. Copié en profondeur dans le worker — les fermetures capturant des objets ou des ressources lèveront une `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Arguments supplémentaires passés à `$task`. Également copiés en profondeur.                                         |

## Valeur de retour

`Async\Future` — se résout avec la valeur de retour de `$task`, ou est rejeté avec toute exception levée par `$task`.

## Exceptions

- `Async\ThreadPoolException` — levée immédiatement si le pool a été fermé via `close()` ou `cancel()`.
- `Async\ThreadTransferException` — levée si `$task` ou l'un des arguments ne peut pas être sérialisé pour le transfert (ex. `stdClass`, références PHP, ressources).

## Exemples

### Exemple #1 Submit basique et await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### Exemple #2 Gérer les exceptions provenant d'une tâche

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### Exemple #3 Soumettre plusieurs tâches en parallèle

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::map()](/fr/docs/reference/thread-pool/map.html) — map parallèle sur un tableau
- [ThreadPool::close()](/fr/docs/reference/thread-pool/close.html) — arrêt gracieux
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant et règles de transfert de données
