---
layout: docs
lang: de
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Pruefen, ob die Dateisystemueberwachung gestoppt wurde."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Gibt `true` zurueck, wenn die Ueberwachung gestoppt wurde --- `close()` wurde aufgerufen, der Scope wurde abgebrochen oder ein Fehler ist aufgetreten.

## Parameter

Keine Parameter.

## Rueckgabewert

`true` --- der Watcher ist geschlossen, `false` --- er ist aktiv.

## Beispiele

### Beispiel #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## Siehe auch

- [FileSystemWatcher::close](/de/docs/reference/filesystem-watcher/close.html) --- Ueberwachung stoppen
