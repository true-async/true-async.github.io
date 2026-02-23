---
layout: docs
lang: en
path_key: "/docs/reference/task-set/is-finished.html"
nav_active: docs
permalink: /en/docs/reference/task-set/is-finished.html
page_title: "TaskSet::isFinished"
description: "Check if all tasks in the set are finished."
---

# TaskSet::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isFinished(): bool
```

Returns `true` if there are no active coroutines and the task queue is empty.

If the set is not sealed, this state may be temporary — new tasks
can be added via `spawn()`.

## Return Value

`true` if all tasks are finished. `false` otherwise.

## Examples

### Example #1 Checking state

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isFinished() ? "yes\n" : "no\n"; // "yes"

    $set->spawn(fn() => "task");
    echo $set->isFinished() ? "yes\n" : "no\n"; // "no"

    $set->seal();
    $set->joinAll()->await();
    echo $set->isFinished() ? "yes\n" : "no\n"; // "yes"
});
```

## See Also

- [TaskSet::isSealed](/en/docs/reference/task-set/is-sealed.html) — Check if the set is sealed
- [TaskSet::count](/en/docs/reference/task-set/count.html) — Number of tasks
