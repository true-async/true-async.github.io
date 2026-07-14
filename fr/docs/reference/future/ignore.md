---
layout: docs
lang: fr
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /fr/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Ne pas propager les erreurs non gérées au gestionnaire de la boucle d'événements."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Marque le `Future` comme ignoré. Si le Future se termine avec une erreur et que l'erreur n'est pas gérée, elle ne sera pas transmise au gestionnaire d'exceptions non gérées de la boucle d'événements. Utile pour les tâches de type « fire-and-forget » dont le résultat n'a pas d'importance.

## Valeur de retour

`Future` — retourne le même Future pour le chaînage de méthodes.

## Exemples

### Exemple #1 Ignorer les erreurs d'un Future

```php
<?php

use Async\Future;
use Async\FutureState;

// Launch a task whose errors we don't care about
$state  = new FutureState();
$future = new Future($state);
$future->ignore();

\Async\spawn(function() use ($state) {
    // This operation may fail
    try {
        sendAnalytics(['event' => 'page_view']);
        $state->complete(null);
    } catch (\Throwable $e) {
        $state->error($e);
    }
});

// The error will not be passed to the event loop handler
```

### Exemple #2 Utilisation de ignore avec le chaînage de méthodes

```php
<?php

use Async\Future;
use Async\FutureState;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        $state = new FutureState();
        (new Future($state))->ignore();  // Cache errors are not critical

        \Async\spawn(function() use ($state, $key) {
            try {
                $data = loadFromDatabase($key);
                saveToCache($key, $data);
                $state->complete(null);
            } catch (\Throwable $e) {
                $state->error($e);
            }
        });
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## Voir aussi

- [Future::catch](/fr/docs/reference/future/catch.html) — Gérer une erreur du Future
- [Future::finally](/fr/docs/reference/future/finally.html) — Callback à la complétion du Future
