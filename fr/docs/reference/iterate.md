---
layout: docs
lang: fr
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /fr/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — itération concurrente sur un tableau ou Traversable avec contrôle de la concurrence et gestion du cycle de vie des coroutines lancées."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Itère de manière concurrente sur un tableau ou un `Traversable`, en appelant un `callback` pour chaque élément.

## Description

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Exécute le `callback` pour chaque élément de l'`iterable` dans une coroutine séparée.
Le paramètre `concurrency` permet de limiter le nombre de callbacks s'exécutant simultanément.
La fonction bloque la coroutine courante jusqu'à ce que toutes les itérations soient terminées.

Toutes les coroutines lancées via `iterate()` s'exécutent dans un `Scope` enfant isolé.

## Paramètres

**`iterable`**
Un tableau ou un objet implémentant `Traversable` (y compris les générateurs et `ArrayIterator`).

**`callback`**
Une fonction appelée pour chaque élément. Accepte deux arguments : `(mixed $value, mixed $key)`.
Si le callback retourne `false`, l'itération s'arrête.

**`concurrency`**
Nombre maximum de callbacks s'exécutant simultanément. Par défaut `0` — la limite par défaut,
tous les éléments sont traités de manière concurrente. Une valeur de `1` signifie l'exécution dans une seule coroutine.

**`cancelPending`**
Contrôle le comportement des coroutines enfants lancées à l'intérieur du callback (via `spawn()`) après la fin de l'itération.
- `true` (par défaut) — toutes les coroutines lancées non terminées sont annulées avec `AsyncCancellation`.
- `false` — `iterate()` attend que toutes les coroutines lancées soient terminées avant de retourner.

## Valeurs de retour

La fonction ne retourne pas de valeur.

## Erreurs/Exceptions

- `Error` — si appelée en dehors d'un contexte asynchrone ou depuis le contexte du planificateur.
- `TypeError` — si `iterable` n'est pas un tableau et n'implémente pas `Traversable`.
- Si le callback lève une exception, l'itération s'arrête, les coroutines restantes sont annulées, et l'exception est propagée au code appelant.

## Exemples

### Exemple #1 Itération basique sur un tableau

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "All requests completed\n";
});
?>
```

### Exemple #2 Limitation de la concurrence

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Traiter au maximum 10 utilisateurs simultanément
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "User $userId loaded\n";
    }, concurrency: 10);

    echo "All users processed\n";
});
?>
```

### Exemple #3 Arrêt de l'itération par condition

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Processing: $item\n";

        if ($item === 'cherry') {
            return false; // Arrêter l'itération
        }
    });

    echo "Iteration finished\n";
});
?>
```

**Sortie :**
```
Processing: apple
Processing: banana
Processing: cherry
Iteration finished
```

### Exemple #4 Itération sur un générateur

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: processing value $value\n";
    }, concurrency: 2);

    echo "All tasks completed\n";
});
?>
```

### Exemple #5 Annulation des coroutines lancées (cancelPending = true)

Par défaut, les coroutines lancées via `spawn()` à l'intérieur du callback sont annulées après la fin de l'itération :

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Lancer une tâche en arrière-plan
        spawn(function() use ($value) {
            try {
                echo "Background task $value started\n";
                suspend();
                suspend();
                echo "Background task $value finished\n"; // Ne s'exécutera pas
            } catch (AsyncCancellation) {
                echo "Background task $value cancelled\n";
            }
        });
    });

    echo "Iteration finished\n";
});
?>
```

**Sortie :**
```
Background task 1 started
Background task 2 started
Background task 3 started
Background task 1 cancelled
Background task 2 cancelled
Background task 3 cancelled
Iteration finished
```

### Exemple #6 Attente des coroutines lancées (cancelPending = false)

Si vous passez `cancelPending: false`, `iterate()` attendra que toutes les coroutines lancées soient terminées :

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Lancer une tâche en arrière-plan
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // Toutes les tâches en arrière-plan sont terminées
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Sortie :**
```
result-1, result-2, result-3
```

### Exemple #7 Gestion des erreurs

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error processing element $value");
            }
            echo "Processed: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Caught: " . $e->getMessage() . "\n";
    }
});
?>
```

## Notes

> **Note :** `iterate()` crée un Scope enfant isolé pour toutes les coroutines lancées.

> **Note :** Lorsqu'un tableau est passé, `iterate()` en crée une copie avant l'itération.
> Modifier le tableau original à l'intérieur du callback n'affecte pas l'itération.

> **Note :** Si le `callback` retourne `false`, l'itération s'arrête,
> mais les coroutines déjà en cours d'exécution continuent jusqu'à leur achèvement (ou annulation, si `cancelPending = true`).

## Journal des modifications

| Version | Description                         |
|---------|-------------------------------------|
| 1.0.0   | Ajout de la fonction `iterate()`.  |

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) - Lancement d'une coroutine
- [await_all()](/fr/docs/reference/await-all.html) - Attente de plusieurs coroutines
- [Scope](/fr/docs/components/scope.html) - Le concept de Scope
- [Cancellation](/fr/docs/components/cancellation.html) - Annulation de coroutines
