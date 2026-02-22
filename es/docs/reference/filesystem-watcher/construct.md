---
layout: docs
lang: es
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /es/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Crear un nuevo FileSystemWatcher y comenzar a observar archivos o un directorio."
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

Crea un observador e inicia inmediatamente el seguimiento de cambios. Los eventos se almacenan en el búfer desde el momento de la creación, incluso si la iteración aún no ha comenzado.

## Parámetros

**path**
: La ruta a un archivo o directorio a observar.
  Si la ruta no existe o es inaccesible, se lanza un `Error`.

**recursive**
: Si es `true`, los directorios anidados también se monitorean.
  El valor predeterminado es `false`.

**coalesce**
: Modo de almacenamiento en búfer de eventos.
  `true` (predeterminado) --- los eventos se agrupan por la clave `path/filename`.
  Los cambios repetidos en el mismo archivo fusionan los indicadores `renamed`/`changed` mediante OR.
  `false` --- cada evento del sistema operativo se almacena como un elemento separado en un búfer circular.

## Errores/Excepciones

- `Error` --- la ruta no existe o no está disponible para observación.

## Ejemplos

### Ejemplo #1 Observar un directorio

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

### Ejemplo #2 Observación recursiva en modo sin agrupación

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## Ver también

- [FileSystemWatcher::close](/es/docs/reference/filesystem-watcher/close.html) --- Detener la observación
- [FileSystemWatcher](/es/docs/components/filesystem-watcher.html) --- Descripción general del concepto
