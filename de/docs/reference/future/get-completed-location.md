---
layout: docs
lang: de
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /de/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Abschlussort des Future als Zeichenkette."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Gibt Informationen über den Abschlussort des `Future` als formatierte Zeichenkette zurück. Praktisch für Protokollierung und Debugging.

## Rückgabewert

`string` — eine Zeichenkette im Format `file:line`, zum Beispiel `/app/worker.php:15`. Wenn das Future noch nicht abgeschlossen ist, wird eine leere Zeichenkette zurückgegeben.

## Beispiele

### Beispiel #1 Den Abschlussort als Zeichenkette abrufen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Beispiel #2 Vollständige Nachverfolgung des Future-Lebenszyklus

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future-Lebenszyklus:\n";
echo "  Erstellt bei:      " . $future->getCreatedLocation() . "\n";
echo "  Abgeschlossen bei: " . $future->getCompletedLocation() . "\n";
echo "  Ergebnis:          " . $result . "\n";
```

## Siehe auch

- [Future::getCompletedFileAndLine](/de/docs/reference/future/get-completed-file-and-line.html) — Abschlussort als Array
- [Future::getCreatedLocation](/de/docs/reference/future/get-created-location.html) — Erstellungsort als Zeichenkette
- [Future::getAwaitingInfo](/de/docs/reference/future/get-awaiting-info.html) — Informationen über Wartende
