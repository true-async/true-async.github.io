---
layout: docs
lang: fr
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /fr/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Crée un Future lié à un FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Crée un nouveau `Future` lié à un objet `FutureState`. `FutureState` gère l'état du Future et permet de le compléter de manière externe avec un résultat ou une erreur.

## Paramètres

`state` — l'objet `FutureState` qui gère l'état de ce Future.

## Exemples

### Exemple #1 Création d'un Future via FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Complete the Future from another coroutine
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Await the result
$value = $future->await();
echo "Received: $value\n";
```

### Exemple #2 Création d'un Future avec un résultat différé

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// One coroutine awaits the result
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Result: $result\n";
});

// Another coroutine provides the result
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Done!");
});
```

## Voir aussi

- [Future::completed](/fr/docs/reference/future/completed.html) — Créer un Future déjà complété
- [Future::failed](/fr/docs/reference/future/failed.html) — Créer un Future avec une erreur
