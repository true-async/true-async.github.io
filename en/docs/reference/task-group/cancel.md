---
layout: docs
lang: en
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /en/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Cancel all tasks in the group."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancels all running coroutines and queued tasks.
Implicitly calls `seal()`. Queued tasks are never started.

Coroutines receive an `AsyncCancellation` and terminate.
Cancellation happens asynchronously --- use `awaitCompletion()` to guarantee completion.

## Parameters

**cancellation**
: The exception serving as the cancellation reason. If `null`, a standard `AsyncCancellation` with the message "TaskGroup cancelled" is used.

## Examples

### Example #1 Cancellation with waiting for completion

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "all tasks cancelled\n";
});
```

### Example #2 Cancellation with a reason

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Timeout exceeded"));
    $group->awaitCompletion();
});
```

## See Also

- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) --- Seal without cancellation
- [TaskGroup::awaitCompletion](/en/docs/reference/task-group/await-completion.html) --- Wait for completion
- [TaskGroup::dispose](/en/docs/reference/task-group/dispose.html) --- Dispose of the group scope
