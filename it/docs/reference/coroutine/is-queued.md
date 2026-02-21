---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Verifica se la coroutine è nella coda dello scheduler."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Verifica se la coroutine è nella coda dello scheduler per l'esecuzione.

## Valore di ritorno

`bool` -- `true` se la coroutine è nella coda.

## Esempi

### Esempio #1 Stato della coda

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- in attesa di avvio

suspend(); // lascia che lo scheduler avvii la coroutine

// La coroutine è avviata ma rimane in coda dopo il suspend() interno
var_dump($coroutine->isStarted()); // bool(true)
```

## Vedi anche

- [Coroutine::isStarted](/it/docs/reference/coroutine/is-started.html) -- Verifica se avviata
- [Coroutine::isSuspended](/it/docs/reference/coroutine/is-suspended.html) -- Verifica la sospensione
