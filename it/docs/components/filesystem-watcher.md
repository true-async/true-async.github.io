---
layout: docs
lang: it
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /it/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher in TrueAsync -- un osservatore persistente del filesystem con supporto all'iterazione foreach, buffering degli eventi e due modalità di archiviazione."
---

# FileSystemWatcher: Monitoraggio del Filesystem

## Cos'è FileSystemWatcher

`Async\FileSystemWatcher` è un osservatore persistente per le modifiche a file e directory.
A differenza degli approcci one-shot, FileSystemWatcher funziona continuamente e consegna gli eventi attraverso l'iterazione standard `foreach`:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

L'iterazione sospende automaticamente la coroutine quando il buffer è vuoto e la riprende quando arriva un nuovo evento.

## FileSystemEvent

Ogni evento è un oggetto `Async\FileSystemEvent` con quattro proprietà readonly:

| Proprietà  | Tipo      | Descrizione                                           |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | Il percorso passato al costruttore di `FileSystemWatcher` |
| `filename` | `?string` | Il nome del file che ha generato l'evento (può essere `null`) |
| `renamed`  | `bool`    | `true` -- il file è stato creato, eliminato o rinominato |
| `changed`  | `bool`    | `true` -- il contenuto del file è stato modificato    |

## Due Modalità di Buffering

### Coalesce (Predefinita)

In modalità coalesce, gli eventi vengono raggruppati per chiave `path/filename`. Se un file è cambiato più volte prima che l'iteratore lo elaborasse, nel buffer rimane un solo evento con i flag uniti:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- predefinito
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

Ottimale per gli scenari tipici: hot-reload, ricostruzione al cambio di configurazione, sincronizzazione.

### Raw

In modalità raw, ogni evento dal SO viene memorizzato come elemento separato in un buffer circolare:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Adatta quando l'ordine esatto e il numero degli eventi è importante -- auditing, logging, replicazione.

## Costruttore

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- percorso a un file o directory. Se il percorso non esiste, viene lanciato un `Error`.

**`recursive`** -- se `true`, vengono monitorate anche le directory annidate.

**`coalesce`** -- modalità di buffering: `true` -- unione degli eventi (HashTable), `false` -- tutti gli eventi (buffer circolare).

Il monitoraggio inizia immediatamente alla creazione dell'oggetto. Gli eventi vengono bufferizzati anche prima dell'inizio dell'iterazione.

## Ciclo di Vita

### close()

Ferma il monitoraggio. L'iterazione corrente termina dopo aver elaborato gli eventi rimanenti nel buffer. Idempotente -- le chiamate ripetute sono sicure.

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

### Chiusura Automatica

Se l'oggetto `FileSystemWatcher` viene distrutto (esce dallo scope), il monitoraggio si ferma automaticamente.

## Esempi

### Hot-Reload della Configurazione

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Configurazione modificata: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Monitoraggio a Tempo Limitato

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

echo "Monitoraggio terminato\n";
?>
```

### Monitoraggio di Directory Multiple

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

### Modalità Raw per Auditing

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

## Cancellazione tramite Scope

FileSystemWatcher termina correttamente quando lo scope viene cancellato:

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
        echo "Iterazione terminata\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## Vedi Anche

- [Coroutine](/it/docs/components/coroutines.html) -- l'unità base della concorrenza
- [Canali](/it/docs/components/channels.html) -- canali CSP per il trasferimento di dati
- [Cancellazione](/it/docs/components/cancellation.html) -- il meccanismo di cancellazione
