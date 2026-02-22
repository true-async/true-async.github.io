---
layout: docs
lang: fr
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /fr/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Vérifie si le Future est annulé."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Vérifie si le `Future` a été annulé. Un Future est considéré comme annulé après l'appel de la méthode `cancel()`.

## Valeur de retour

`bool` — `true` si le Future a été annulé, `false` sinon.

## Exemples

### Exemple #1 Vérification de l'annulation d'un Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### Exemple #2 Différence entre complétion et annulation

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## Voir aussi

- [Future::cancel](/fr/docs/reference/future/cancel.html) — Annuler le Future
- [Future::isCompleted](/fr/docs/reference/future/is-completed.html) — Vérifier si le Future est complété
