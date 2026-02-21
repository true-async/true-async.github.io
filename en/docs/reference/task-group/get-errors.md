---
layout: docs
lang: en
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /en/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Get an array of errors from failed tasks."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Returns an array of exceptions (`Throwable`) from tasks that failed with an error.
Array keys match the task keys from `spawn()` or `spawnWithKey()`.

The method does not wait for tasks to complete --- it returns only the errors available at the time of the call.

## Return Value

An `array<int|string, Throwable>` where the key is the task identifier and the value is the exception.

## Examples

### Example #1 Viewing errors

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## Unhandled Errors

If unhandled errors remain when a TaskGroup is destroyed, the destructor signals this.
Errors are considered handled if:

- `all()` is called with `ignoreErrors: false` (default) and throws a `CompositeException`
- `suppressErrors()` is called
- Errors are handled through the iterator (`foreach`)

## See Also

- [TaskGroup::getResults](/en/docs/reference/task-group/get-results.html) --- Get an array of results
- [TaskGroup::suppressErrors](/en/docs/reference/task-group/suppress-errors.html) --- Mark errors as handled
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
