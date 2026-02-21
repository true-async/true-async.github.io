---
layout: docs
lang: de
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /de/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Bricht alle Koroutinen im Scope ab."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Bricht alle Koroutinen ab, die zum angegebenen Scope gehoeren. Jede aktive Koroutine erhaelt eine `CancelledException`. Wenn `$cancellationError` angegeben wird, wird diese als Abbruchgrund verwendet.

## Parameter

`cancellationError` — eine benutzerdefinierte Abbruch-Exception. Wenn `null`, wird die Standard-`CancelledException` verwendet.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Einfacher Abbruch

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Lange Operation
    } catch (\Async\CancelledException $e) {
        echo "Koroutine abgebrochen\n";
    }
});

// Alle Koroutinen abbrechen
$scope->cancel();
```

### Beispiel #2 Abbruch mit benutzerdefiniertem Fehler

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Grund: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout ueberschritten");
$scope->cancel($error);
```

## Siehe auch

- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Abbrechen und den Scope schliessen
- [Scope::isCancelled](/de/docs/reference/scope/is-cancelled.html) — Pruefen, ob der Scope abgebrochen wurde
- [Scope::awaitAfterCancellation](/de/docs/reference/scope/await-after-cancellation.html) — Nach dem Abbruch warten
