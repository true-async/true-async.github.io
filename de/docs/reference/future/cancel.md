---
layout: docs
lang: de
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /de/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Das Future abbrechen."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Bricht das `Future` ab. Alle Coroutinen, die dieses Future über `await()` abwarten, erhalten eine `CancelledException`. Wenn der Parameter `$cancellation` angegeben wird, wird er als Abbruchgrund verwendet.

## Parameter

`cancellation` — eine benutzerdefinierte Abbruch-Ausnahme. Wenn `null`, wird die Standard-`CancelledException` verwendet.

## Rückgabewert

Die Funktion gibt keinen Wert zurück.

## Beispiele

### Beispiel #1 Einfacher Future-Abbruch

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Eine Coroutine, die auf das Ergebnis wartet
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future abgebrochen\n";
    }
});

// Das Future abbrechen
$future->cancel();
```

### Beispiel #2 Abbruch mit benutzerdefiniertem Grund

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Grund: " . $e->getMessage() . "\n";
        // Grund: Timeout überschritten
    }
});

$future->cancel(new AsyncCancellation("Timeout überschritten"));
```

## Siehe auch

- [Future::isCancelled](/de/docs/reference/future/is-cancelled.html) — Prüfen, ob das Future abgebrochen ist
- [Future::await](/de/docs/reference/future/await.html) — Das Ergebnis abwarten
- [Future::catch](/de/docs/reference/future/catch.html) — Future-Fehler behandeln
