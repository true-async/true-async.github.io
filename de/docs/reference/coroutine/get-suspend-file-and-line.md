---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Die Datei und Zeile abrufen, an der die Coroutine unterbrochen ist."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Gibt die Datei und Zeilennummer zurueck, an der die Coroutine unterbrochen wurde (oder zuletzt unterbrochen war).

## Rueckgabewert

`array` -- ein Array mit zwei Elementen:
- `[0]` -- Dateiname (`string` oder `null`)
- `[1]` -- Zeilennummer (`int`)

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // Zeile 7
});

suspend(); // Coroutine unterbrechen lassen

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Unterbrochen in: $file:$line\n"; // /app/script.php:7
```

## Siehe auch

- [Coroutine::getSuspendLocation](/de/docs/reference/coroutine/get-suspend-location.html) -- Unterbrechungsort als Zeichenkette
- [Coroutine::getSpawnFileAndLine](/de/docs/reference/coroutine/get-spawn-file-and-line.html) -- Erstellungsdatei und -zeile
