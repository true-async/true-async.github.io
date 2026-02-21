---
layout: docs
lang: en
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "Check if file system watching has been stopped."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

Returns `true` if watching has been stopped --- `close()` was called, the scope was cancelled, or an error occurred.

## Parameters

No parameters.

## Return Value

`true` --- the watcher is closed, `false` --- it is active.

## Examples

### Example #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## See Also

- [FileSystemWatcher::close](/en/docs/reference/filesystem-watcher/close.html) --- Stop watching
