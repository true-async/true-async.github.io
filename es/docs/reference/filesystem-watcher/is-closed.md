---
layout: docs
lang: es
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Verificar si la observación del sistema de archivos ha sido detenida."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Devuelve `true` si la observación ha sido detenida --- se llamó a `close()`, el ámbito fue cancelado o se produjo un error.

## Parámetros

Sin parámetros.

## Valor de retorno

`true` --- el observador está cerrado, `false` --- está activo.

## Ejemplos

### Ejemplo #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## Ver también

- [FileSystemWatcher::close](/es/docs/reference/filesystem-watcher/close.html) --- Detener la observación
