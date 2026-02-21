---
layout: docs
lang: de
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /de/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Die Dateisystemueberwachung stoppen und die Iteration beenden."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Stoppt die Ueberwachung des Dateisystems. Die Iteration ueber `foreach` endet nach der Verarbeitung der verbleibenden gepufferten Ereignisse.

Idempotent --- wiederholte Aufrufe sind sicher.

## Parameter

Keine Parameter.

## Beispiele

### Beispiel #1 Schliessen nach Empfang des gewuenschten Ereignisses

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Markierungsdatei erkannt\n";
?>
```

### Beispiel #2 Schliessen aus einer anderen Coroutine

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/data');

spawn(function() use ($watcher) {
    delay(10_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processEvent($event);
}

echo "Ueberwachung durch Timeout beendet\n";
?>
```

## Siehe auch

- [FileSystemWatcher::isClosed](/de/docs/reference/filesystem-watcher/is-closed.html) --- Zustand pruefen
- [FileSystemWatcher::__construct](/de/docs/reference/filesystem-watcher/construct.html) --- Einen Watcher erstellen
