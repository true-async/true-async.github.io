---
layout: docs
lang: en
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /en/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "Create a new FileSystemWatcher and start watching files or a directory."
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

Creates a watcher and immediately starts tracking changes. Events are buffered from the moment of creation, even if iteration has not yet begun.

## Parameters

**path**
: The path to a file or directory to watch.
  If the path does not exist or is inaccessible, an `Error` is thrown.

**recursive**
: If `true`, nested directories are also monitored.
  Default is `false`.

**coalesce**
: Event buffering mode.
  `true` (default) --- events are grouped by `path/filename` key.
  Repeated changes to the same file merge the `renamed`/`changed` flags via OR.
  `false` --- each OS event is stored as a separate element in a circular buffer.

## Errors/Exceptions

- `Error` --- the path does not exist or is not available for watching.

## Examples

### Example #1 Watching a directory

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

### Example #2 Recursive watching in raw mode

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## See Also

- [FileSystemWatcher::close](/en/docs/reference/filesystem-watcher/close.html) --- Stop watching
- [FileSystemWatcher](/en/docs/components/filesystem-watcher.html) --- Concept overview
