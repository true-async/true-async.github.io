---
layout: docs
lang: fr
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /fr/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Crée un Future complété avec une erreur."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Crée un `Future` immédiatement complété avec l'erreur spécifiée. Appeler `await()` sur un tel Future lèvera l'exception fournie.

## Paramètres

`throwable` — l'exception avec laquelle le Future sera complété.

## Valeur de retour

`Future` — un Future complété avec une erreur.

## Exemples

### Exemple #1 Création d'un Future avec une erreur

```php
<?php

use Async\Future;
use Async\FutureState;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### Exemple #2 Utilisation pour un retour d'erreur anticipé

```php
<?php

use Async\Future;
use Async\FutureState;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    $state = new FutureState();

    \Async\spawn(function() use ($state, $host) {
        try {
            $state->complete(performConnection($host));
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return new Future($state);
}

$future = connectToService('');
$future
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
    })
    ->ignore();
```

## Voir aussi

- [Future::completed](/fr/docs/reference/future/completed.html) — Créer un Future avec un résultat
- [Future::catch](/fr/docs/reference/future/catch.html) — Gérer une erreur du Future
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat
