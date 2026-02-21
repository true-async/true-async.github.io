---
layout: docs
lang: de
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /de/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Erstellungsort des Future als Array."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Gibt Informationen über den Erstellungsort des `Future` als Array zurück. Enthält den Dateinamen und die Zeilennummer, an der dieses Future erstellt wurde. Nützlich zum Debuggen und Nachverfolgen.

## Rückgabewert

`array` — ein Array mit den Schlüsseln `file` (Zeichenkette, Dateipfad) und `line` (Ganzzahl, Zeilennummer).

## Beispiele

### Beispiel #1 Den Erstellungsort abrufen

```php
<?php

use Async\Future;

$future = Future::completed(42); // Zeile 5

$location = $future->getCreatedFileAndLine();
echo "Datei: " . $location['file'] . "\n";
echo "Zeile: " . $location['line'] . "\n";
// Datei: /app/script.php
// Zeile: 5
```

### Beispiel #2 Future-Informationen protokollieren

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future erstellt bei %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## Siehe auch

- [Future::getCreatedLocation](/de/docs/reference/future/get-created-location.html) — Erstellungsort als Zeichenkette
- [Future::getCompletedFileAndLine](/de/docs/reference/future/get-completed-file-and-line.html) — Abschlussort des Future
- [Future::getAwaitingInfo](/de/docs/reference/future/get-awaiting-info.html) — Informationen über Wartende
