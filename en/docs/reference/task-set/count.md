---
layout: docs
lang: en
path_key: "/docs/reference/task-set/count.html"
nav_active: docs
permalink: /en/docs/reference/task-set/count.html
page_title: "TaskSet::count"
description: "Get the number of tasks not yet delivered to the consumer."
---

# TaskSet::count

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::count(): int
```

Returns the number of tasks that have not yet been delivered to the consumer.

Unlike `TaskGroup::count()`, which returns the total number of tasks,
`TaskSet::count()` decreases with each result delivery via
`joinNext()`, `joinAny()`, `joinAll()`, or `foreach`.

`TaskSet` implements `Countable`, so you can use `count($set)`.

## Return Value

The number of tasks in the set.

## Examples

### Example #1 Tracking progress

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");
    $set->spawn(fn() => "c");

    echo $set->count() . "\n"; // 3

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 2

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 1

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 0
});
```

## See Also

- [TaskSet::isFinished](/en/docs/reference/task-set/is-finished.html) — Check if all tasks are finished
- [TaskSet::joinNext](/en/docs/reference/task-set/join-next.html) — Get the next result
