---
layout: docs
lang: de
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /de/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher in TrueAsync -- ein persistenter Dateisystem-Beobachter mit foreach-Iterationsunterstützung, Event-Pufferung und zwei Speichermodi."
---

# FileSystemWatcher: Dateisystemüberwachung

## Was ist FileSystemWatcher

`Async\FileSystemWatcher` ist ein persistenter Beobachter für Änderungen an Dateien und Verzeichnissen.
Im Gegensatz zu einmaligen Ansätzen läuft FileSystemWatcher kontinuierlich und liefert Ereignisse über die Standard-`foreach`-Iteration:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

Die Iteration suspendiert die Coroutine automatisch, wenn der Puffer leer ist, und setzt sie fort, wenn ein neues Ereignis eintrifft.

## FileSystemEvent

Jedes Ereignis ist ein `Async\FileSystemEvent`-Objekt mit vier readonly-Eigenschaften:

| Eigenschaft | Typ       | Beschreibung                                          |
|-------------|-----------|-------------------------------------------------------|
| `path`      | `string`  | Der an den `FileSystemWatcher`-Konstruktor übergebene Pfad |
| `filename`  | `?string` | Der Name der Datei, die das Ereignis ausgelöst hat (kann `null` sein) |
| `renamed`   | `bool`    | `true` -- Datei wurde erstellt, gelöscht oder umbenannt |
| `changed`   | `bool`    | `true` -- Dateiinhalt wurde geändert                  |

## Zwei Pufferungsmodi

### Coalesce (Standard)

Im Coalesce-Modus werden Ereignisse nach dem Schlüssel `path/filename` gruppiert. Wenn sich eine Datei mehrmals geändert hat, bevor der Iterator sie verarbeitet hat, bleibt nur ein Ereignis mit zusammengeführten Flags im Puffer:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- Standard
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

Dies ist optimal für typische Szenarien: Hot-Reload, Neuaufbau bei Konfigurationsänderungen, Synchronisation.

### Raw

Im Raw-Modus wird jedes Ereignis vom Betriebssystem als separates Element in einem Ringpuffer gespeichert:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Geeignet, wenn die genaue Reihenfolge und Anzahl der Ereignisse wichtig ist -- Auditing, Logging, Replikation.

## Konstruktor

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- Pfad zu einer Datei oder einem Verzeichnis. Wenn der Pfad nicht existiert, wird ein `Error` geworfen.

**`recursive`** -- wenn `true`, werden auch verschachtelte Verzeichnisse überwacht.

**`coalesce`** -- Pufferungsmodus: `true` -- Event-Zusammenführung (HashTable), `false` -- alle Events (Ringpuffer).

Die Überwachung beginnt sofort bei der Objekterstellung. Ereignisse werden auch vor Beginn der Iteration gepuffert.

## Lebenszyklus

### close()

Stoppt die Überwachung. Die aktuelle Iteration endet nach Verarbeitung der verbleibenden Ereignisse im Puffer. Idempotent -- wiederholte Aufrufe sind sicher.

```php
<?php
$watcher->close();
?>
```

### isClosed()

```php
<?php
$watcher->isClosed(); // bool
?>
```

### Automatisches Schließen

Wenn das `FileSystemWatcher`-Objekt zerstört wird (den Gültigkeitsbereich verlässt), wird die Überwachung automatisch gestoppt.

## Beispiele

### Hot-Reload der Konfiguration

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Konfiguration geändert: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Zeitlich begrenzte Überwachung

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/uploads');

spawn(function() use ($watcher) {
    delay(30_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processUpload($event->filename);
}

echo "Überwachung beendet\n";
?>
```

### Überwachung mehrerer Verzeichnisse

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

$dirs = ['/var/log/app', '/var/log/nginx', '/var/log/postgres'];

foreach ($dirs as $dir) {
    spawn(function() use ($dir) {
        $watcher = new FileSystemWatcher($dir);

        foreach ($watcher as $event) {
            echo "[{$dir}] {$event->filename}\n";
        }
    });
}
?>
```

### Raw-Modus für Auditing

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/secure/data', coalesce: false);

    foreach ($watcher as $event) {
        $type = $event->renamed ? 'RENAME' : 'CHANGE';
        auditLog("[{$type}] {$event->path}/{$event->filename}");
    }
});
?>
```

## Abbruch über Scope

FileSystemWatcher wird korrekt beendet, wenn der Scope abgebrochen wird:

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/test');

    spawn(function() use ($watcher) {
        foreach ($watcher as $event) {
            echo "{$event->filename}\n";
        }
        echo "Iteration beendet\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## Siehe auch

- [Coroutines](/de/docs/components/coroutines.html) -- die grundlegende Einheit der Nebenläufigkeit
- [Channel](/de/docs/components/channels.html) -- CSP-Channels für Datenübertragung
- [Cancellation](/de/docs/components/cancellation.html) -- der Abbruchmechanismus
