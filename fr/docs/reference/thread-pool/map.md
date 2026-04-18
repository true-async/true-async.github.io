---
layout: docs
lang: fr
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /fr/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Appliquer un callable à chaque élément d'un tableau en parallèle à l'aide du pool de threads."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Soumet `$task($item)` pour chaque élément de `$items` aux workers du pool de façon concurrente, puis bloque la coroutine appelante jusqu'à ce que toutes les tâches soient terminées. Retourne les résultats dans le même ordre que le tableau d'entrée, quel que soit l'ordre dans lequel les workers se terminent.

Si une tâche lève une exception, `map()` la relève dans la coroutine appelante. Les autres tâches en cours ne sont pas annulées.

## Paramètres

| Paramètre | Type       | Description                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | Les éléments d'entrée. Chaque élément est passé comme premier argument à `$task`.                        |
| `$task`   | `callable` | Le callable à appliquer à chaque élément. Exécuté dans un thread de travail ; les mêmes règles de transfert de données que `submit()` s'appliquent. |

## Valeur de retour

`array` — résultats de `$task` pour chaque élément d'entrée, dans le même ordre que `$items`.

## Exceptions

- `Async\ThreadPoolException` — si le pool a été fermé.
- Relève la première exception levée par n'importe quelle tâche.

## Exemples

### Exemple #1 Compter les lignes de plusieurs fichiers en parallèle

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

### Exemple #2 Calcul numérique en parallèle

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $inputs = [1_000_000, 2_000_000, 3_000_000, 4_000_000];

    $results = $pool->map($inputs, function(int $n) {
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    foreach ($inputs as $i => $n) {
        echo "$n iterations → {$results[$i]}\n";
    }

    $pool->close();
});
```

## Voir aussi

- [ThreadPool::submit()](/fr/docs/reference/thread-pool/submit.html) — soumettre une seule tâche et obtenir un Future
- [Async\ThreadPool](/fr/docs/components/thread-pool.html) — vue d'ensemble du composant
