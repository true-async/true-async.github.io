---
layout: docs
lang: en
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /en/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "FileSystemWatcher in TrueAsync -- a persistent filesystem observer with foreach iteration support, event buffering, and two storage modes."
---

# FileSystemWatcher: Filesystem Monitoring

## What is FileSystemWatcher

`Async\FileSystemWatcher` is a persistent observer for changes in files and directories.
Unlike one-shot approaches, FileSystemWatcher runs continuously and delivers events through standard `foreach` iteration:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

Iteration automatically suspends the coroutine when the buffer is empty and resumes it when a new event arrives.

## FileSystemEvent

Each event is an `Async\FileSystemEvent` object with four readonly properties:

| Property   | Type      | Description                                           |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | The path passed to the `FileSystemWatcher` constructor |
| `filename` | `?string` | The name of the file that triggered the event (may be `null`) |
| `renamed`  | `bool`    | `true` -- file was created, deleted, or renamed       |
| `changed`  | `bool`    | `true` -- file contents were modified                 |

## Two Buffering Modes

### Coalesce (Default)

In coalesce mode, events are grouped by the `path/filename` key. If a file changed multiple times before the iterator processed it, only one event with merged flags remains in the buffer:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- default
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

This is optimal for typical scenarios: hot-reload, config change rebuilds, synchronization.

### Raw

In raw mode, each event from the OS is stored as a separate element in a circular buffer:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

Suitable when exact order and count of events matters -- auditing, logging, replication.

## Constructor

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- path to a file or directory. If the path doesn't exist, an `Error` is thrown.

**`recursive`** -- if `true`, nested directories are also monitored.

**`coalesce`** -- buffering mode: `true` -- event merging (HashTable), `false` -- all events (circular buffer).

Monitoring starts immediately upon object creation. Events are buffered even before iteration begins.

## Lifecycle

### close()

Stops monitoring. The current iteration finishes after processing remaining events in the buffer. Idempotent -- repeated calls are safe.

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

### Automatic Closing

If the `FileSystemWatcher` object is destroyed (goes out of scope), monitoring automatically stops.

## Examples

### Hot-Reload Configuration

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Config changed: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### Time-Limited Monitoring

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

echo "Monitoring finished\n";
?>
```

### Monitoring Multiple Directories

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

### Raw Mode for Auditing

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

## Cancellation via Scope

FileSystemWatcher terminates correctly when the scope is cancelled:

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
        echo "Iteration finished\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## See Also

- [Coroutines](/en/docs/components/coroutines.html) -- the basic unit of concurrency
- [Channel](/en/docs/components/channels.html) -- CSP channels for data transfer
- [Cancellation](/en/docs/components/cancellation.html) -- the cancellation mechanism
