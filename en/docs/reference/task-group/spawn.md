---
layout: docs
lang: en
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /en/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Add a task to the group with an auto-incremented key."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Adds a callable to the group with an auto-incremented key (0, 1, 2, ...).

If no concurrency limit is set or a slot is available, the coroutine is created immediately.
Otherwise, the callable with its arguments is placed in a queue and started when a slot becomes available.

## Parameters

**task**
: The callable to execute. Accepts any callable: Closure, function, method.

**args**
: Arguments passed to the callable.

## Errors

Throws `Async\AsyncException` if the group is sealed (`seal()`) or cancelled (`cancel()`).

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Example #2 With arguments

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## See Also

- [TaskGroup::spawnWithKey](/en/docs/reference/task-group/spawn-with-key.html) --- Add a task with an explicit key
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
