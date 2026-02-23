---
layout: docs
lang: en
path_key: "/docs/reference/task-set/join-all.html"
nav_active: docs
permalink: /en/docs/reference/task-set/join-all.html
page_title: "TaskSet::joinAll"
description: "Wait for all tasks and get an array of results with automatic set cleanup."
---

# TaskSet::joinAll

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAll(bool $ignoreErrors = false): Async\Future
```

Returns a `Future` that resolves with an array of results when all tasks are completed.
Array keys match the keys assigned during `spawn()` / `spawnWithKey()`.

**After delivering the results, all entries are automatically removed from the set**, and `count()` becomes 0.

If tasks are already completed, the `Future` resolves immediately.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`.

## Parameters

**ignoreErrors**
: If `false` (default) and there are errors, the `Future` rejects with `CompositeException`.
  If `true`, errors are ignored and the `Future` resolves with only successful results.

## Return Value

`Async\Future` — a future result containing an array of task results.
Call `->await()` to get the value.

## Errors

The `Future` rejects with `Async\CompositeException` if `$ignoreErrors = false` and at least one task finished with an error.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('a', fn() => 10);
    $set->spawnWithKey('b', fn() => 20);
    $set->spawnWithKey('c', fn() => 30);

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)

    echo $set->count() . "\n"; // 0
});
```

### Example #2 Error handling

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    try {
        $set->joinAll()->await();
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

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    $results = $set->joinAll(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1
});
```

### Example #4 Waiting with timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());
    $set->seal();

    try {
        $results = $set->joinAll()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "Failed to get data within 5 seconds\n";
    }
});
```

## See Also

- [TaskSet::joinNext](/en/docs/reference/task-set/join-next.html) — Result of the first completed task
- [TaskSet::joinAny](/en/docs/reference/task-set/join-any.html) — Result of the first successful task
- [TaskGroup::all](/en/docs/reference/task-group/all.html) — Equivalent without auto-cleanup
