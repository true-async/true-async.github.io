---
layout: docs
lang: en
path_key: "/docs/reference/task-set/finally.html"
nav_active: docs
permalink: /en/docs/reference/task-set/finally.html
page_title: "TaskSet::finally"
description: "Register a completion handler for the set."
---

# TaskSet::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::finally(Closure $callback): void
```

Registers a callback that is called when the set is sealed and all tasks are completed.
The callback receives the TaskSet as a parameter.

Since `cancel()` implicitly calls `seal()`, the handler also fires on cancellation.

If the set is already finished, the callback is called synchronously immediately.

## Parameters

**callback**
: Closure accepting `TaskSet` as its only argument.

## Examples

### Example #1 Logging completion

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->finally(function(TaskSet $s) {
        echo "Set completed\n";
    });

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");

    $set->seal();
    $set->joinAll()->await();
});
// Output:
// Set completed
```

### Example #2 Calling on an already finished set

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();
    $set->spawn(fn() => 1);
    $set->seal();
    $set->joinAll()->await();

    // Set is already finished — callback is called synchronously
    $set->finally(function(TaskSet $s) {
        echo "called immediately\n";
    });

    echo "after finally\n";
});
// Output:
// called immediately
// after finally
```

## See Also

- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set
- [TaskSet::awaitCompletion](/en/docs/reference/task-set/await-completion.html) — Wait for completion
