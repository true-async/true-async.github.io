---
layout: docs
lang: en
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /en/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Register a completion handler for the group."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Registers a callback that is invoked when the group is sealed and all tasks have completed.
The callback receives the TaskGroup as a parameter.

Since `cancel()` implicitly calls `seal()`, the handler also fires on cancellation.

If the group is already finished, the callback is called synchronously immediately.

## Parameters

**callback**
: A Closure that takes `TaskGroup` as its only argument.

## Examples

### Example #1 Logging completion

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Completed: " . $g->count() . " tasks\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Output:
// Completed: 2 tasks
```

### Example #2 Calling on an already finished group

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Group is already finished — callback is called synchronously
    $group->finally(function(TaskGroup $g) {
        echo "called immediately\n";
    });

    echo "after finally\n";
});
// Output:
// called immediately
// after finally
```

## See Also

- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) --- Seal the group
- [TaskGroup::cancel](/en/docs/reference/task-group/cancel.html) --- Cancel tasks
