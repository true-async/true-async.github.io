---
layout: docs
lang: en
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /en/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Get the total number of tasks in the group."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Returns the total number of tasks in the group: queued, running, and completed.

TaskGroup implements the `Countable` interface, so you can use `count($group)`.

## Return Value

The total number of tasks (`int`).

## Examples

### Example #1 Counting tasks

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## See Also

- [TaskGroup::isFinished](/en/docs/reference/task-group/is-finished.html) --- Check if all tasks are finished
- [TaskGroup::isSealed](/en/docs/reference/task-group/is-sealed.html) --- Check if the group is sealed
