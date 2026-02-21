---
layout: docs
lang: it
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Verifica se il monitoraggio del file system è stato interrotto."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Restituisce `true` se il monitoraggio è stato interrotto --- è stato chiamato `close()`, lo scope è stato cancellato o si è verificato un errore.

## Parametri

Nessun parametro.

## Valore di ritorno

`true` --- il watcher è chiuso, `false` --- è attivo.

## Esempi

### Esempio #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## Vedi anche

- [FileSystemWatcher::close](/it/docs/reference/filesystem-watcher/close.html) --- Interrompe il monitoraggio
