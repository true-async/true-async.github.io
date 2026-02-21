---
layout: docs
lang: en
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /en/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "Get an asynchronous iterator for foreach traversal of file system events."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

Returns an iterator for use with `foreach`. Called automatically when using `foreach ($watcher as $event)`.

The iterator yields `Async\FileSystemEvent` objects. When the buffer is empty, the coroutine suspends until a new event arrives. Iteration ends when the watcher is closed and the buffer is exhausted.

## Parameters

No parameters.

## Return Value

`Iterator` --- an iterator yielding `Async\FileSystemEvent` objects.

## Errors/Exceptions

- `Error` --- if the iterator is used outside a coroutine.

## Examples

### Example #1 Standard usage with foreach

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

### Example #2 Interrupting with break

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

## See Also

- [FileSystemWatcher](/en/docs/components/filesystem-watcher.html) --- Concept overview
- [FileSystemWatcher::close](/en/docs/reference/filesystem-watcher/close.html) --- Stop watching
