---
layout: docs
lang: en
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /en/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "Stop watching the file system and end iteration."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

Stops watching the file system. Iteration via `foreach` ends after processing the remaining buffered events.

Idempotent --- repeated calls are safe.

## Parameters

No parameters.

## Examples

### Example #1 Closing after receiving the desired event

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

### Example #2 Closing from another coroutine

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

## See Also

- [FileSystemWatcher::isClosed](/en/docs/reference/filesystem-watcher/is-closed.html) --- Check state
- [FileSystemWatcher::__construct](/en/docs/reference/filesystem-watcher/construct.html) --- Create a watcher
