---
layout: docs
lang: en
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /en/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Close the group to prevent new tasks."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

Closes the group. Any attempt to use `spawn()` or `spawnWithKey()` will throw an exception.
Already running coroutines and queued tasks continue to execute.

Repeated calls are a no-op.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->close();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## See Also

- [TaskGroup::cancel](/en/docs/reference/task-group/cancel.html) --- Cancel all tasks (implicitly calls close)
- [TaskGroup::isClosed](/en/docs/reference/task-group/is-closed.html) --- Check if the group is closed
