---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Pruefen, ob die Coroutine abgebrochen wurde."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Prueft, ob die Coroutine abgebrochen **und** abgeschlossen wurde. Gibt nur dann `true` zurueck, wenn der Abbruch vollstaendig abgeschlossen ist.

Befindet sich die Coroutine innerhalb von `protect()`, gibt `isCancelled()` `false` zurueck, bis der geschuetzte Abschnitt abgeschlossen ist, auch wenn `cancel()` bereits aufgerufen wurde. Um eine Abbruchanforderung zu pruefen, verwenden Sie `isCancellationRequested()`.

## Rueckgabewert

`bool` -- `true`, wenn die Coroutine abgebrochen und abgeschlossen wurde.

## Beispiele

### Beispiel #1 Einfacher Abbruch

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // Abbruch abschliessen lassen

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Beispiel #2 Aufgeschobener Abbruch mit protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Kritischer Abschnitt -- Abbruch wird aufgeschoben
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Abbruch angefordert, aber noch nicht abgeschlossen
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // protect() abschliessen lassen

var_dump($coroutine->isCancelled());             // bool(true)
```

## Siehe auch

- [Coroutine::isCancellationRequested](/de/docs/reference/coroutine/is-cancellation-requested.html) -- Abbruchanforderung pruefen
- [Coroutine::cancel](/de/docs/reference/coroutine/cancel.html) -- Die Coroutine abbrechen
- [Cancellation](/de/docs/components/cancellation.html) -- Abbruch-Konzept
