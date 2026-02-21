---
layout: docs
lang: de
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /de/docs/reference/future/await.html
page_title: "Future::await"
description: "Das Ergebnis des Future abwarten."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Wartet auf die Fertigstellung des `Future` und gibt dessen Ergebnis zurück. Blockiert die aktuelle Coroutine, bis das Future abgeschlossen ist. Wenn das Future mit einem Fehler abgeschlossen wurde, wird diese Ausnahme ausgelöst. Sie können ein `Completable` übergeben, um das Warten per Timeout oder externer Bedingung abzubrechen.

## Parameter

`cancellation` — ein Objekt zum Abbruch des Wartens. Wenn angegeben und ausgelöst, bevor das Future abgeschlossen ist, wird eine `CancelledException` geworfen. Standardwert ist `null`.

## Rückgabewert

`mixed` — das Ergebnis des Future.

## Fehler

Löst eine Ausnahme aus, wenn das Future mit einem Fehler abgeschlossen wurde oder abgebrochen wurde.

## Beispiele

### Beispiel #1 Einfaches Abwarten eines Ergebnisses

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Ergebnis: $result\n"; // Ergebnis: 42
```

### Beispiel #2 Fehlerbehandlung beim Abwarten

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Etwas ist schiefgelaufen");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Fehler: " . $e->getMessage() . "\n";
    // Fehler: Etwas ist schiefgelaufen
}
```

## Siehe auch

- [Future::isCompleted](/de/docs/reference/future/is-completed.html) — Prüfen, ob das Future abgeschlossen ist
- [Future::cancel](/de/docs/reference/future/cancel.html) — Das Future abbrechen
- [Future::map](/de/docs/reference/future/map.html) — Das Ergebnis transformieren
