---
layout: docs
lang: en
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /en/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Create a Future that resolves with the result of the first successful task."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Returns a `Future` that resolves with the result of the first *successfully* completed task.
Tasks that failed with an error are skipped.
The remaining tasks **continue running**.

If all tasks fail with errors, the `Future` rejects with `CompositeException`.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`.

## Return Value

`Async\Future` --- a future result of the first successful task.
Call `->await()` to get the value.

## Errors

- Throws `Async\AsyncException` if the group is empty.
- The `Future` rejects with `Async\CompositeException` if all tasks fail with errors.

## Examples

### Example #1 First successful

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // Errors from failed tasks must be explicitly suppressed
    $group->suppressErrors();
});
```

### Example #2 All failed

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errors\n"; // "2 errors"
    }
});
```

### Example #3 Resilient search with timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "No provider responded within 3 seconds\n";
    }

    $group->suppressErrors();
});
```

## See Also

- [TaskGroup::race](/en/docs/reference/task-group/race.html) --- First completed (success or error)
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- All results
