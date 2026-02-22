---
layout: docs
lang: es
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /es/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher en TrueAsync -- un observador persistente del sistema de archivos con soporte de iteracion foreach, buffer de eventos y dos modos de almacenamiento."
---

# FileSystemWatcher: Monitoreo del Sistema de Archivos

## Que es FileSystemWatcher

`Async\FileSystemWatcher` es un observador persistente de cambios en archivos y directorios.
A diferencia de los enfoques de un solo uso, FileSystemWatcher se ejecuta continuamente y entrega eventos a traves de la iteracion estandar `foreach`:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

La iteracion suspende automaticamente la corrutina cuando el buffer esta vacio y la reanuda cuando llega un nuevo evento.

## FileSystemEvent

Cada evento es un objeto `Async\FileSystemEvent` con cuatro propiedades readonly:

| Propiedad  | Tipo      | Descripcion                                           |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | La ruta pasada al constructor de `FileSystemWatcher`  |
| `filename` | `?string` | El nombre del archivo que desencadeno el evento (puede ser `null`) |
| `renamed`  | `bool`    | `true` -- el archivo fue creado, eliminado o renombrado |
| `changed`  | `bool`    | `true` -- el contenido del archivo fue modificado     |

## Dos Modos de Buffer

### Coalesce (Por Defecto)

En el modo coalesce, los eventos se agrupan por la clave `path/filename`. Si un archivo cambio multiples veces antes de que el iterador lo procesara, solo queda un evento con las banderas combinadas en el buffer:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- por defecto
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

Esto es optimo para escenarios tipicos: hot-reload, reconstruccion por cambios de configuracion, sincronizacion.

### Raw

En el modo raw, cada evento del SO se almacena como un elemento separado en un buffer circular:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Adecuado cuando el orden exacto y la cantidad de eventos importan -- auditoria, registro de logs, replicacion.

## Constructor

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- ruta a un archivo o directorio. Si la ruta no existe, se lanza un `Error`.

**`recursive`** -- si es `true`, los directorios anidados tambien se monitorean.

**`coalesce`** -- modo de buffer: `true` -- combinacion de eventos (HashTable), `false` -- todos los eventos (buffer circular).

El monitoreo comienza inmediatamente al crear el objeto. Los eventos se almacenan en buffer incluso antes de que comience la iteracion.

## Ciclo de Vida

### close()

Detiene el monitoreo. La iteracion actual termina despues de procesar los eventos restantes en el buffer. Idempotente -- las llamadas repetidas son seguras.

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

### Cierre Automatico

Si el objeto `FileSystemWatcher` es destruido (sale del ambito), el monitoreo se detiene automaticamente.

## Ejemplos

### Hot-Reload de Configuracion

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Configuracion cambiada: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Monitoreo con Limite de Tiempo

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

echo "Monitoreo finalizado\n";
?>
```

### Monitoreo de Multiples Directorios

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

### Modo Raw para Auditoria

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

## Cancelacion via Scope

FileSystemWatcher termina correctamente cuando el scope es cancelado:

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
        echo "Iteracion finalizada\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## Vea Tambien

- [Corrutinas](/es/docs/components/coroutines.html) -- la unidad basica de concurrencia
- [Canal](/es/docs/components/channels.html) -- canales CSP para transferencia de datos
- [Cancelacion](/es/docs/components/cancellation.html) -- el mecanismo de cancelacion
