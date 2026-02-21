---
layout: docs
lang: it
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /it/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Verifica se il Future e' stato annullato."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Verifica se il `Future` e' stato annullato. Un Future e' considerato annullato dopo che il metodo `cancel()` e' stato chiamato.

## Valore di ritorno

`bool` --- `true` se il Future e' stato annullato, `false` altrimenti.

## Esempi

### Esempio #1 Verifica dell'annullamento del Future

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

### Esempio #2 Differenza tra completamento e annullamento

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

## Vedi anche

- [Future::cancel](/it/docs/reference/future/cancel.html) --- Annulla il Future
- [Future::isCompleted](/it/docs/reference/future/is-completed.html) --- Verifica se il Future e' completato
