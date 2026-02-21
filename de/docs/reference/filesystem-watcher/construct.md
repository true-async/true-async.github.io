---
layout: docs
lang: de
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /de/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Einen neuen FileSystemWatcher erstellen und die Ueberwachung von Dateien oder einem Verzeichnis starten."
---

# FileSystemWatcher::__construct

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::__construct(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

Erstellt einen Watcher und beginnt sofort mit der Verfolgung von Aenderungen. Ereignisse werden ab dem Moment der Erstellung gepuffert, auch wenn die Iteration noch nicht begonnen hat.

## Parameter

**path**
: Der Pfad zu einer Datei oder einem Verzeichnis, das ueberwacht werden soll.
  Wenn der Pfad nicht existiert oder nicht zugaenglich ist, wird ein `Error` geworfen.

**recursive**
: Wenn `true`, werden auch verschachtelte Verzeichnisse ueberwacht.
  Standard ist `false`.

**coalesce**
: Ereignis-Pufferungsmodus.
  `true` (Standard) --- Ereignisse werden nach dem Schluessel `Pfad/Dateiname` gruppiert.
  Wiederholte Aenderungen an derselben Datei fuehren die `renamed`/`changed`-Flags per OR zusammen.
  `false` --- jedes OS-Ereignis wird als separates Element in einem Ringpuffer gespeichert.

## Fehler/Ausnahmen

- `Error` --- der Pfad existiert nicht oder ist nicht zur Ueberwachung verfuegbar.

## Beispiele

### Beispiel #1 Ein Verzeichnis ueberwachen

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/mydir');

foreach ($watcher as $event) {
    echo "{$event->filename}\n";
    $watcher->close();
}
?>
```

### Beispiel #2 Rekursive Ueberwachung im Rohmodus

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## Siehe auch

- [FileSystemWatcher::close](/de/docs/reference/filesystem-watcher/close.html) --- Ueberwachung stoppen
- [FileSystemWatcher](/de/docs/components/filesystem-watcher.html) --- Konzeptuebersicht
