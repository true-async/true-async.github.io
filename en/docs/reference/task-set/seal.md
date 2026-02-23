---
layout: docs
lang: en
path_key: "/docs/reference/task-set/seal.html"
nav_active: docs
permalink: /en/docs/reference/task-set/seal.html
page_title: "TaskSet::seal"
description: "Seal the set for new tasks."
---

# TaskSet::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::seal(): void
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
    $set->seal();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## See Also

- [TaskSet::cancel](/en/docs/reference/task-set/cancel.html) — Cancel all tasks (implicitly calls seal)
- [TaskSet::isSealed](/en/docs/reference/task-set/is-sealed.html) — Check if the set is sealed
