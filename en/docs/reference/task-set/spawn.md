---
layout: docs
lang: en
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /en/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Add a task to the set with an auto-increment key."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Adds a callable to the set with an auto-increment key (0, 1, 2, ...).

If no concurrency limit is set or a slot is available, the coroutine is created immediately.
Otherwise, the callable with arguments is placed in a queue and started when a slot becomes available.

## Parameters

**task**
: Callable to execute. Accepts any callable: Closure, function, method.

**args**
: Arguments passed to the callable.

## Errors

Throws `Async\AsyncException` if the set is sealed (`seal()`) or cancelled (`cancel()`).

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "first");
    $set->spawn(fn() => "second");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Example #2 With arguments

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## See Also

- [TaskSet::spawnWithKey](/en/docs/reference/task-set/spawn-with-key.html) — Add a task with an explicit key
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — Wait for all tasks
