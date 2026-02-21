---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Die Ausfuehrung einer Coroutine abbrechen."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Bricht die Ausfuehrung der Coroutine ab. Die Coroutine erhaelt eine `AsyncCancellation`-Ausnahme am naechsten Unterbrechungspunkt (`suspend`, `await`, `delay` usw.).

Der Abbruch funktioniert kooperativ -- die Coroutine wird nicht sofort unterbrochen. Befindet sich die Coroutine innerhalb von `protect()`, wird der Abbruch aufgeschoben, bis der geschuetzte Abschnitt abgeschlossen ist.

## Parameter

**cancellation**
: Die Ausnahme, die als Abbruchgrund dient. Bei `null` wird eine Standard-`AsyncCancellation` erstellt.

## Beispiele

### Beispiel #1 Einfacher Abbruch

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Abgebrochen: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Beispiel #2 Abbruch mit Grund

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout ueberschritten"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout ueberschritten"
}
```

### Beispiel #3 Abbruch vor dem Start

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "sollte nicht abgeschlossen werden";
});

// Abbrechen, bevor der Scheduler die Coroutine startet
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine vor dem Start abgebrochen\n";
}
```

## Siehe auch

- [Coroutine::isCancelled](/de/docs/reference/coroutine/is-cancelled.html) -- Abbruch pruefen
- [Coroutine::isCancellationRequested](/de/docs/reference/coroutine/is-cancellation-requested.html) -- Abbruchanforderung pruefen
- [Cancellation](/de/docs/components/cancellation.html) -- Abbruch-Konzept
- [protect()](/de/docs/reference/protect.html) -- Geschuetzter Abschnitt
