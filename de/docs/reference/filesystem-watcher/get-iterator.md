---
layout: docs
lang: de
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /de/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Einen asynchronen Iterator fuer die foreach-Durchquerung von Dateisystemereignissen erhalten."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Gibt einen Iterator zur Verwendung mit `foreach` zurueck. Wird automatisch bei Verwendung von `foreach ($watcher as $event)` aufgerufen.

Der Iterator liefert `Async\FileSystemEvent`-Objekte. Wenn der Puffer leer ist, wird die Coroutine suspendiert, bis ein neues Ereignis eintrifft. Die Iteration endet, wenn der Watcher geschlossen ist und der Puffer erschoepft ist.

## Parameter

Keine Parameter.

## Rueckgabewert

`Iterator` --- ein Iterator, der `Async\FileSystemEvent`-Objekte liefert.

## Fehler/Ausnahmen

- `Error` --- wenn der Iterator ausserhalb einer Coroutine verwendet wird.

## Beispiele

### Beispiel #1 Standardverwendung mit foreach

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/dir');

    spawn(function() use ($watcher) {
        delay(5000);
        $watcher->close();
    });

    foreach ($watcher as $event) {
        echo "Ereignis: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Iteration abgeschlossen\n";
});
?>
```

### Beispiel #2 Unterbrechen mit break

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

foreach ($watcher as $event) {
    if ($event->filename === 'stop.flag') {
        break;
    }
    processEvent($event);
}

$watcher->close();
?>
```

## Siehe auch

- [FileSystemWatcher](/de/docs/components/filesystem-watcher.html) --- Konzeptuebersicht
- [FileSystemWatcher::close](/de/docs/reference/filesystem-watcher/close.html) --- Ueberwachung stoppen
