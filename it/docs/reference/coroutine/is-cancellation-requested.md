---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Verifica se è stato richiesto l'annullamento della coroutine."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Verifica se è stato richiesto l'annullamento della coroutine. A differenza di `isCancelled()`, restituisce `true` immediatamente dopo la chiamata a `cancel()`, anche se la coroutine è ancora in esecuzione all'interno di `protect()`.

## Valore di ritorno

`bool` -- `true` se è stato richiesto l'annullamento.

## Esempi

### Esempio #1 Differenza da isCancelled()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// Prima dell'annullamento
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Immediatamente dopo cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- ancora in protect()
```

## Vedi anche

- [Coroutine::isCancelled](/it/docs/reference/coroutine/is-cancelled.html) -- Verifica l'annullamento completato
- [Coroutine::cancel](/it/docs/reference/coroutine/cancel.html) -- Annulla la coroutine
- [protect()](/it/docs/reference/protect.html) -- Sezione protetta
