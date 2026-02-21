---
layout: docs
lang: it
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /it/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Interrompe il monitoraggio del file system e termina l'iterazione."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Interrompe il monitoraggio del file system. L'iterazione tramite `foreach` termina dopo l'elaborazione degli eventi rimanenti nel buffer.

Idempotente --- le chiamate ripetute sono sicure.

## Parametri

Nessun parametro.

## Esempi

### Esempio #1 Chiusura dopo aver ricevuto l'evento desiderato

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "File marcatore rilevato\n";
?>
```

### Esempio #2 Chiusura da un'altra coroutine

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

echo "Monitoraggio terminato per timeout\n";
?>
```

## Vedi anche

- [FileSystemWatcher::isClosed](/it/docs/reference/filesystem-watcher/is-closed.html) --- Verifica lo stato
- [FileSystemWatcher::__construct](/it/docs/reference/filesystem-watcher/construct.html) --- Crea un watcher
