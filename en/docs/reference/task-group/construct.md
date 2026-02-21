---
layout: docs
lang: en
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /en/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Create a new TaskGroup with optional concurrency limit."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Creates a new task group.

## Parameters

**concurrency**
: Maximum number of concurrently running coroutines.
  `null` --- no limit, all tasks are started immediately.
  When the limit is reached, new tasks are placed in a queue
  and started automatically when a slot becomes available.

**scope**
: Parent scope. TaskGroup creates a child scope for its coroutines.
  `null` --- the current scope is inherited.

## Examples

### Example #1 Without limits

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // starts immediately
$group->spawn(fn() => "task 2"); // starts immediately
$group->spawn(fn() => "task 3"); // starts immediately
```

### Example #2 With concurrency limit

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // starts immediately
$group->spawn(fn() => "task 2"); // starts immediately
$group->spawn(fn() => "task 3"); // waits in queue
```

## See Also

- [TaskGroup::spawn](/en/docs/reference/task-group/spawn.html) --- Add a task
- [Scope](/en/docs/components/scope.html) --- Coroutine lifecycle management
