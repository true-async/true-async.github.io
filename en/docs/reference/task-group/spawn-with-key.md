---
layout: docs
lang: en
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /en/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Add a task to the group with an explicit key."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Adds a callable to the group with the specified key.
The task result will be accessible by this key in `all()`, `getResults()`, and during iteration.

## Parameters

**key**
: The task key. A string or integer. Duplicates are not allowed.

**task**
: The callable to execute.

**args**
: Arguments passed to the callable.

## Errors

Throws `Async\AsyncException` if the group is sealed or the key already exists.

## Examples

### Example #1 Named tasks

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## See Also

- [TaskGroup::spawn](/en/docs/reference/task-group/spawn.html) --- Add a task with an auto-incremented key
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
