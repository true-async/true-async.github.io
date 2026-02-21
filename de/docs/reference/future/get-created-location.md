---
layout: docs
lang: de
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /de/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Erstellungsort des Future als Zeichenkette."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Gibt Informationen über den Erstellungsort des `Future` als formatierte Zeichenkette zurück. Praktisch für Protokollierung und Debug-Ausgaben.

## Rückgabewert

`string` — eine Zeichenkette im Format `file:line`, zum Beispiel `/app/script.php:42`.

## Beispiele

### Beispiel #1 Den Erstellungsort als Zeichenkette abrufen

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Beispiel #2 Verwendung in Debug-Meldungen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Lang laufende Futures debuggen
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warnung: Future erstellt bei "
            . $future->getCreatedLocation()
            . " wurde seit über 5 Sekunden nicht abgeschlossen\n";
    }
});
```

## Siehe auch

- [Future::getCreatedFileAndLine](/de/docs/reference/future/get-created-file-and-line.html) — Erstellungsort als Array
- [Future::getCompletedLocation](/de/docs/reference/future/get-completed-location.html) — Abschlussort als Zeichenkette
- [Future::getAwaitingInfo](/de/docs/reference/future/get-awaiting-info.html) — Informationen über Wartende
