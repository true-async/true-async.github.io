---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Den Erstellungsort der Coroutine als Zeichenkette abrufen."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Gibt den Erstellungsort der Coroutine im Format `"Datei:Zeile"` zurueck. Wenn die Information nicht verfuegbar ist, wird `"unknown"` zurueckgegeben.

## Rueckgabewert

`string` -- eine Zeichenkette wie `"/app/script.php:42"` oder `"unknown"`.

## Beispiele

### Beispiel #1 Debug-Ausgabe

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Erstellt in: " . $coroutine->getSpawnLocation() . "\n";
// Ausgabe: "Erstellt in: /app/script.php:5"
```

### Beispiel #2 Alle Coroutinen protokollieren

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} erstellt in {$coro->getSpawnLocation()}\n";
}
```

## Siehe auch

- [Coroutine::getSpawnFileAndLine](/de/docs/reference/coroutine/get-spawn-file-and-line.html) -- Datei und Zeile als Array
- [Coroutine::getSuspendLocation](/de/docs/reference/coroutine/get-suspend-location.html) -- Unterbrechungsort
- [get_coroutines()](/de/docs/reference/get-coroutines.html) -- Alle aktiven Coroutinen
