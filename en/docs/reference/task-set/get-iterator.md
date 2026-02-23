---
layout: docs
lang: en
path_key: "/docs/reference/task-set/get-iterator.html"
nav_active: docs
permalink: /en/docs/reference/task-set/get-iterator.html
page_title: "TaskSet::getIterator"
description: "Get an iterator for traversing results with automatic cleanup."
---

# TaskSet::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::getIterator(): Iterator
```

Returns an iterator that yields results **as tasks complete**.
TaskSet implements `IteratorAggregate`, so you can use `foreach` directly.

**Each processed entry is automatically removed from the set**, freeing memory
and decreasing `count()`.

## Iterator Behavior

- `foreach` suspends the current coroutine until the next result is available
- The key is the same one assigned during `spawn()` or `spawnWithKey()`
- The value is an array `[mixed $result, ?Throwable $error]`:
  - Success: `[$result, null]`
  - Error: `[null, $error]`
- Iteration ends when the set is sealed **and** all tasks have been processed
- If the set is not sealed, `foreach` suspends waiting for new tasks

> **Important:** Without calling `seal()`, iteration will wait indefinitely.

## Examples

### Example #1 Streaming processing

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    for ($i = 0; $i < 100; $i++) {
        $set->spawn(fn() => processItem($items[$i]));
    }
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key: error — {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key: done\n";
        // Entry removed, memory freed
    }

    echo $set->count() . "\n"; // 0
});
```

### Example #2 Named keys

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('users', fn() => fetchUsers());
    $set->spawnWithKey('orders', fn() => fetchOrders());
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: received " . count($result) . " records\n";
        }
    }
});
```

## See Also

- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — Wait for all tasks
- [TaskSet::joinNext](/en/docs/reference/task-set/join-next.html) — Next result
