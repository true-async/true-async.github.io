---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Pruefen, ob ein Abbruch fuer die Coroutine angefordert wurde."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Prueft, ob ein Abbruch fuer die Coroutine angefordert wurde. Im Unterschied zu `isCancelled()` gibt diese Methode sofort nach dem Aufruf von `cancel()` `true` zurueck, auch wenn die Coroutine noch innerhalb von `protect()` ausgefuehrt wird.

## Rueckgabewert

`bool` -- `true`, wenn ein Abbruch angefordert wurde.

## Beispiele

### Beispiel #1 Unterschied zu isCancelled()

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

// Vor dem Abbruch
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Sofort nach cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- noch in protect()
```

## Siehe auch

- [Coroutine::isCancelled](/de/docs/reference/coroutine/is-cancelled.html) -- Abgeschlossenen Abbruch pruefen
- [Coroutine::cancel](/de/docs/reference/coroutine/cancel.html) -- Die Coroutine abbrechen
- [protect()](/de/docs/reference/protect.html) -- Geschuetzter Abschnitt
