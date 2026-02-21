---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Den Unterbrechungsort der Coroutine als Zeichenkette abrufen."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Gibt den Unterbrechungsort der Coroutine im Format `"Datei:Zeile"` zurueck. Wenn die Information nicht verfuegbar ist, wird `"unknown"` zurueckgegeben.

## Rueckgabewert

`string` -- eine Zeichenkette wie `"/app/script.php:42"` oder `"unknown"`.

## Beispiele

### Beispiel #1 Blockierte Coroutine diagnostizieren

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // hier blockiert
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} wartet bei: {$coro->getSuspendLocation()}\n";
    }
}
```

## Siehe auch

- [Coroutine::getSuspendFileAndLine](/de/docs/reference/coroutine/get-suspend-file-and-line.html) -- Datei und Zeile als Array
- [Coroutine::getSpawnLocation](/de/docs/reference/coroutine/get-spawn-location.html) -- Erstellungsort
- [Coroutine::getTrace](/de/docs/reference/coroutine/get-trace.html) -- Vollstaendiger Aufrufstapel
