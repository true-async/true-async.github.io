---
layout: docs
lang: en
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /en/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Wait for all tasks to complete without throwing exceptions."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Waits until all tasks in the group have fully completed.
Unlike `all()`, it does not return results and does not throw exceptions on task errors.

The group must be sealed before calling this method.

A typical use case is waiting for coroutines to actually finish after `cancel()`.
The `cancel()` method initiates cancellation, but coroutines may finish asynchronously.
`awaitCompletion()` guarantees that all coroutines have stopped.

## Errors

Throws `Async\AsyncException` if the group is not sealed.

## Examples

### Example #1 Waiting after cancel

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "all coroutines finished\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Example #2 Getting results after waiting

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // No exceptions — check manually
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Successful: " . count($results) . "\n"; // 1
    echo "Errors: " . count($errors) . "\n";      // 1
});
```

## See Also

- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks and get results
- [TaskGroup::cancel](/en/docs/reference/task-group/cancel.html) --- Cancel all tasks
- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) --- Seal the group
