---
layout: docs
lang: it
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /it/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Verifica se il Future e' completato."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Verifica se il `Future` e' completato. Un Future e' considerato completato se contiene un risultato, un errore, oppure e' stato annullato.

## Valore di ritorno

`bool` --- `true` se il Future e' completato (con successo, con un errore o annullato), `false` altrimenti.

## Esempi

### Esempio #1 Verifica del completamento del Future

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

### Esempio #2 Verifica dei metodi factory statici

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## Vedi anche

- [Future::isCancelled](/it/docs/reference/future/is-cancelled.html) --- Verifica se il Future e' annullato
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato del Future
