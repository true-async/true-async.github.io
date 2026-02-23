---
layout: docs
lang: en
path_key: "/docs/reference/task-set/cancel.html"
nav_active: docs
permalink: /en/docs/reference/task-set/cancel.html
page_title: "TaskSet::cancel"
description: "Cancel all tasks in the set."
---

# TaskSet::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancels all running coroutines and clears the task queue.
Implicitly calls `seal()`.

## Parameters

**cancellation**
: Cancellation reason. If `null`, a default `AsyncCancellation` is created.

## Examples

### Example #1 Conditional cancellation

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask1());
    $set->spawn(fn() => longRunningTask2());

    // Cancel all tasks
    $set->cancel();

    echo $set->isSealed() ? "sealed\n" : "no\n"; // "sealed"
});
```

## See Also

- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set
- [TaskSet::dispose](/en/docs/reference/task-set/dispose.html) — Destroy the set scope
