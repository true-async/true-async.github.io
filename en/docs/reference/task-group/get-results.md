---
layout: docs
lang: en
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /en/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Get an array of results from completed tasks."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Returns an array of results from successfully completed tasks.
Array keys match the keys assigned via `spawn()` (auto-increment) or `spawnWithKey()` (custom).

The method does not wait for tasks to complete --- it returns only the results available at the time of the call.

## Return Value

An `array<int|string, mixed>` where the key is the task identifier and the value is the execution result.

## Examples

### Example #1 Getting results after all()

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Example #2 Results do not contain errors

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## See Also

- [TaskGroup::getErrors](/en/docs/reference/task-group/get-errors.html) --- Get an array of errors
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- Wait for all tasks
- [TaskGroup::suppressErrors](/en/docs/reference/task-group/suppress-errors.html) --- Mark errors as handled
