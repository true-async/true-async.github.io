---
layout: docs
lang: it
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /it/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Ottiene un iteratore asincrono per scorrere gli eventi del file system con foreach."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Restituisce un iteratore da utilizzare con `foreach`. Viene chiamato automaticamente quando si usa `foreach ($watcher as $event)`.

L'iteratore produce oggetti `Async\FileSystemEvent`. Quando il buffer è vuoto, la coroutine si sospende fino all'arrivo di un nuovo evento. L'iterazione termina quando il watcher viene chiuso e il buffer è esaurito.

## Parametri

Nessun parametro.

## Valore di ritorno

`Iterator` --- un iteratore che produce oggetti `Async\FileSystemEvent`.

## Errori/Eccezioni

- `Error` --- se l'iteratore viene utilizzato al di fuori di una coroutine.

## Esempi

### Esempio #1 Utilizzo standard con foreach

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
        echo "Evento: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Iterazione completata\n";
});
?>
```

### Esempio #2 Interruzione con break

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

## Vedi anche

- [FileSystemWatcher](/it/docs/components/filesystem-watcher.html) --- Panoramica del concetto
- [FileSystemWatcher::close](/it/docs/reference/filesystem-watcher/close.html) --- Interrompe il monitoraggio
