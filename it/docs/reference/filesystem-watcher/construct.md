---
layout: docs
lang: it
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /it/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Crea un nuovo FileSystemWatcher e inizia il monitoraggio di file o di una directory."
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

Crea un watcher e inizia immediatamente a tracciare le modifiche. Gli eventi vengono bufferizzati dal momento della creazione, anche se l'iterazione non è ancora iniziata.

## Parametri

**path**
: Il percorso di un file o una directory da monitorare.
  Se il percorso non esiste o non è accessibile, viene lanciato un `Error`.

**recursive**
: Se `true`, vengono monitorate anche le directory annidate.
  Il valore predefinito è `false`.

**coalesce**
: Modalità di bufferizzazione degli eventi.
  `true` (predefinito) --- gli eventi vengono raggruppati per chiave `path/filename`.
  Le modifiche ripetute allo stesso file uniscono i flag `renamed`/`changed` tramite OR.
  `false` --- ogni evento del sistema operativo viene memorizzato come elemento separato in un buffer circolare.

## Errori/Eccezioni

- `Error` --- il percorso non esiste o non è disponibile per il monitoraggio.

## Esempi

### Esempio #1 Monitoraggio di una directory

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

### Esempio #2 Monitoraggio ricorsivo in modalità raw

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## Vedi anche

- [FileSystemWatcher::close](/it/docs/reference/filesystem-watcher/close.html) --- Interrompe il monitoraggio
- [FileSystemWatcher](/it/docs/components/filesystem-watcher.html) --- Panoramica del concetto
