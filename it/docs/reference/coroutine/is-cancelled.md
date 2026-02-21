---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Verifica se la coroutine è stata annullata."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Verifica se la coroutine è stata annullata **e** completata. Restituisce `true` solo quando l'annullamento è completamente terminato.

Se la coroutine è all'interno di `protect()`, `isCancelled()` restituirà `false` fino al completamento della sezione protetta, anche se `cancel()` è già stato chiamato. Per verificare una richiesta di annullamento, utilizzare `isCancellationRequested()`.

## Valore di ritorno

`bool` -- `true` se la coroutine è stata annullata e completata.

## Esempi

### Esempio #1 Annullamento base

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // lascia che l'annullamento si completi

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Esempio #2 Annullamento posticipato con protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Sezione critica -- l'annullamento è posticipato
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Annullamento richiesto ma non ancora completato
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // lascia che protect() si completi

var_dump($coroutine->isCancelled());             // bool(true)
```

## Vedi anche

- [Coroutine::isCancellationRequested](/it/docs/reference/coroutine/is-cancellation-requested.html) -- Verifica la richiesta di annullamento
- [Coroutine::cancel](/it/docs/reference/coroutine/cancel.html) -- Annulla la coroutine
- [Cancellazione](/it/docs/components/cancellation.html) -- Concetto di annullamento
