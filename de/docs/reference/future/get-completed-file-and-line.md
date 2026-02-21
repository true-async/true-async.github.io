---
layout: docs
lang: de
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /de/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Abschlussort des Future als Array."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Gibt Informationen über den Ort zurück, an dem das `Future` abgeschlossen wurde (wo `complete()` oder `fail()` auf dem zugehörigen `FutureState` aufgerufen wurde). Enthält den Dateinamen und die Zeilennummer. Nützlich zum Debuggen und Nachverfolgen asynchroner Ketten.

## Rückgabewert

`array` — ein Array mit den Schlüsseln `file` (Zeichenkette, Dateipfad) und `line` (Ganzzahl, Zeilennummer). Wenn das Future noch nicht abgeschlossen ist, wird ein leeres Array zurückgegeben.

## Beispiele

### Beispiel #1 Den Abschlussort abrufen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // Zeile 8

$location = $future->getCompletedFileAndLine();
echo "Datei: " . $location['file'] . "\n";
echo "Zeile: " . $location['line'] . "\n";
// Datei: /app/script.php
// Zeile: 8
```

### Beispiel #2 Erstellungs- und Abschlussort vergleichen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Erstellt bei: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Abgeschlossen bei: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## Siehe auch

- [Future::getCompletedLocation](/de/docs/reference/future/get-completed-location.html) — Abschlussort als Zeichenkette
- [Future::getCreatedFileAndLine](/de/docs/reference/future/get-created-file-and-line.html) — Erstellungsort des Future
- [Future::getAwaitingInfo](/de/docs/reference/future/get-awaiting-info.html) — Informationen über Wartende
