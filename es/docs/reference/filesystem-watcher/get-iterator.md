---
layout: docs
lang: es
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /es/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Obtener un iterador asíncrono para recorrer eventos del sistema de archivos con foreach."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Devuelve un iterador para usar con `foreach`. Se llama automáticamente al usar `foreach ($watcher as $event)`.

El iterador produce objetos `Async\FileSystemEvent`. Cuando el búfer está vacío, la corrutina se suspende hasta que llegue un nuevo evento. La iteración finaliza cuando el observador se cierra y el búfer se agota.

## Parámetros

Sin parámetros.

## Valor de retorno

`Iterator` --- un iterador que produce objetos `Async\FileSystemEvent`.

## Errores/Excepciones

- `Error` --- si el iterador se utiliza fuera de una corrutina.

## Ejemplos

### Ejemplo #1 Uso estándar con foreach

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
        echo "Event: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Iteration completed\n";
});
?>
```

### Ejemplo #2 Interrumpir con break

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

## Ver también

- [FileSystemWatcher](/es/docs/components/filesystem-watcher.html) --- Descripción general del concepto
- [FileSystemWatcher::close](/es/docs/reference/filesystem-watcher/close.html) --- Detener la observación
