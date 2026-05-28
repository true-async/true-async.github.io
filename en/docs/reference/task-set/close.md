---
layout: docs
lang: en
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /en/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "Close the set for new tasks."
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
```

Seals the set. After this, `spawn()` and `spawnWithKey()` throw an exception.
Already running coroutines and queued tasks continue to work.

Repeated calls are a noop.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "task");
    $set->close();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## See Also

- [TaskSet::cancel](/en/docs/reference/task-set/cancel.html) — Cancel all tasks (implicitly calls close)
- [TaskSet::isClosed](/en/docs/reference/task-set/is-closed.html) — Check if the set is closed
