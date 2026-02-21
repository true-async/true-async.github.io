---
layout: docs
lang: en
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /en/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Create a Future that resolves with an array of all task results."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Returns a `Future` that resolves with an array of results when all tasks have completed.
Array keys match the keys assigned via `spawn()` / `spawnWithKey()`.

If tasks have already completed, the `Future` resolves immediately.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`,
allowing you to set a timeout or other cancellation strategy.

## Parameters

**ignoreErrors**
: If `false` (default) and there are errors, the `Future` rejects with `CompositeException`.
  If `true`, errors are ignored and the `Future` resolves with only successful results.
  Errors can be retrieved via `getErrors()`.

## Return Value

`Async\Future` --- a future result containing the array of task results.
Call `->await()` to get the value.

## Errors

The `Future` rejects with `Async\CompositeException` if `$ignoreErrors = false` and at least one task failed with an error.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Example #2 Error handling

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Example #3 Ignoring errors

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Example #4 Waiting with a timeout

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Failed to get data within 5 seconds\n";
    }
});
```

## See Also

- [TaskGroup::awaitCompletion](/en/docs/reference/task-group/await-completion.html) --- Wait for completion without exceptions
- [TaskGroup::getResults](/en/docs/reference/task-group/get-results.html) --- Get results without waiting
- [TaskGroup::getErrors](/en/docs/reference/task-group/get-errors.html) --- Get errors
