---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Verifica se la coroutine è sospesa."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Verifica se la coroutine è sospesa. Una coroutine diventa sospesa quando viene chiamato `suspend()`, durante operazioni di I/O o durante l'attesa con `await()`.

## Valore di ritorno

`bool` -- `true` se la coroutine è sospesa.

## Esempi

### Esempio #1 Verifica della sospensione

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // lascia che la coroutine si avvii e si sospenda

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## Vedi anche

- [Coroutine::isRunning](/it/docs/reference/coroutine/is-running.html) -- Verifica l'esecuzione
- [Coroutine::getTrace](/it/docs/reference/coroutine/get-trace.html) -- Stack delle chiamate di una coroutine sospesa
- [suspend()](/it/docs/reference/suspend.html) -- Sospendi la coroutine corrente
