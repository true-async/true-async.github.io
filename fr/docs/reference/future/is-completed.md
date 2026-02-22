---
layout: docs
lang: fr
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /fr/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Vérifie si le Future est complété."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Vérifie si le `Future` est complété. Un Future est considéré comme complété s'il contient un résultat, une erreur ou s'il a été annulé.

## Valeur de retour

`bool` — `true` si le Future est complété (avec succès, avec une erreur ou annulé), `false` sinon.

## Exemples

### Exemple #1 Vérification de la complétion d'un Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### Exemple #2 Vérification des méthodes de fabrique statiques

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## Voir aussi

- [Future::isCancelled](/fr/docs/reference/future/is-cancelled.html) — Vérifier si le Future est annulé
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat du Future
