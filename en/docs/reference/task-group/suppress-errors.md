---
layout: docs
lang: en
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /en/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Mark all current errors as handled."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Marks all current errors in the group as handled.

When a TaskGroup is destroyed, it checks for unhandled errors. If errors were not handled
(via `all()`, `foreach`, or `suppressErrors()`), the destructor signals lost errors.
Calling `suppressErrors()` is an explicit confirmation that the errors have been handled.

## Examples

### Example #1 Suppressing errors after selective handling

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Handle errors manually
    foreach ($group->getErrors() as $key => $error) {
        log_error("Task $key: {$error->getMessage()}");
    }

    // Mark errors as handled
    $group->suppressErrors();
});
```

## See Also

- [TaskGroup::getErrors](/en/docs/reference/task-group/get-errors.html) --- Get an array of errors
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
