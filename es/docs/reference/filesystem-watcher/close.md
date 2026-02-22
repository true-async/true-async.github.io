---
layout: docs
lang: es
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /es/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Detener la observación del sistema de archivos y finalizar la iteración."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Detiene la observación del sistema de archivos. La iteración mediante `foreach` finaliza después de procesar los eventos restantes en el búfer.

Idempotente --- las llamadas repetidas son seguras.

## Parámetros

Sin parámetros.

## Ejemplos

### Ejemplo #1 Cerrar después de recibir el evento deseado

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Marker file detected\n";
?>
```

### Ejemplo #2 Cerrar desde otra corrutina

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

echo "Watching ended by timeout\n";
?>
```

## Ver también

- [FileSystemWatcher::isClosed](/es/docs/reference/filesystem-watcher/is-closed.html) --- Verificar estado
- [FileSystemWatcher::__construct](/es/docs/reference/filesystem-watcher/construct.html) --- Crear un observador
