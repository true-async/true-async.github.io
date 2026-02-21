---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Die Datei und Zeile abrufen, in der die Coroutine erstellt wurde."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Gibt die Datei und Zeilennummer zurueck, in der `spawn()` aufgerufen wurde, um diese Coroutine zu erstellen.

## Rueckgabewert

`array` -- ein Array mit zwei Elementen:
- `[0]` -- Dateiname (`string` oder `null`)
- `[1]` -- Zeilennummer (`int`)

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // Zeile 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "Datei: $file\n";  // /app/script.php
echo "Zeile: $line\n";  // 5
```

## Siehe auch

- [Coroutine::getSpawnLocation](/de/docs/reference/coroutine/get-spawn-location.html) -- Erstellungsort als Zeichenkette
- [Coroutine::getSuspendFileAndLine](/de/docs/reference/coroutine/get-suspend-file-and-line.html) -- Unterbrechungsdatei und -zeile
