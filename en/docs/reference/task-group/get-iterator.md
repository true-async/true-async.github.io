---
layout: docs
lang: en
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /en/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Get an iterator to traverse results as tasks complete."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Returns an iterator that yields results **as tasks complete**.
TaskGroup implements `IteratorAggregate`, so you can use `foreach` directly.

## Iterator Behavior

- `foreach` suspends the current coroutine until the next result is available
- The key is the same as assigned via `spawn()` or `spawnWithKey()`
- The value is an array `[mixed $result, ?Throwable $error]`:
  - Success: `[$result, null]`
  - Error: `[null, $error]`
- Iteration ends when the group is sealed **and** all tasks have been processed
- If the group is not sealed, `foreach` suspends waiting for new tasks

> **Important:** Without calling `seal()`, iteration will wait indefinitely.

## Examples

### Example #1 Processing results as they become ready

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key failed: {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key done\n";
    }
});
```

### Example #2 Iteration with named keys

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: received " . count($result) . " records\n";
        }
    }
});
```

## See Also

- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) --- Seal the group
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
- [TaskGroup::getResults](/en/docs/reference/task-group/get-results.html) --- Get an array of results
