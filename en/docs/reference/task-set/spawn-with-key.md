---
layout: docs
lang: en
path_key: "/docs/reference/task-set/spawn-with-key.html"
nav_active: docs
permalink: /en/docs/reference/task-set/spawn-with-key.html
page_title: "TaskSet::spawnWithKey"
description: "Add a task to the set with an explicit key."
---

# TaskSet::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Adds a callable to the set with a specified key. The key is used in the results array
and during iteration via `foreach`.

## Parameters

**key**
: Result key. Must be unique within the set.

**task**
: Callable to execute.

**args**
: Arguments passed to the callable.

## Errors

- Throws `Async\AsyncException` if the set is sealed or cancelled.
- Throws `Async\AsyncException` if the key is already in use.

## Examples

### Example #1 Named tasks

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('user',   fn() => fetchUser($id));
    $set->spawnWithKey('orders', fn() => fetchOrders($id));

    $set->seal();
    $data = $set->joinAll()->await();

    echo $data['user']['name'];
    echo count($data['orders']);
});
```

## See Also

- [TaskSet::spawn](/en/docs/reference/task-set/spawn.html) — Add a task with an auto-key
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — Wait for all tasks
