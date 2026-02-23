---
layout: docs
lang: en
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /en/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Create a new TaskSet with optional concurrency limit."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Creates a new task set with automatic cleanup of results after delivery.

## Parameters

**concurrency**
: Maximum number of concurrently running coroutines.
  `null` — no limit, all tasks start immediately.
  When the limit is reached, new tasks are placed in a queue
  and started automatically when a slot becomes available.

**scope**
: Parent scope. TaskSet creates a child scope for its coroutines.
  `null` — the current scope is inherited.

## Examples

### Example #1 Without limits

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // starts immediately
$set->spawn(fn() => "task 2"); // starts immediately
$set->spawn(fn() => "task 3"); // starts immediately
```

### Example #2 With concurrency limit

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // starts immediately
$set->spawn(fn() => "task 2"); // starts immediately
$set->spawn(fn() => "task 3"); // waits in queue
```

## See Also

- [TaskSet::spawn](/en/docs/reference/task-set/spawn.html) — Add a task
- [TaskGroup::__construct](/en/docs/reference/task-group/construct.html) — TaskGroup constructor
