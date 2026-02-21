---
layout: docs
lang: en
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /en/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Create a Future that resolves with the result of the first completed task."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Returns a `Future` that resolves with the result of the first completed task --- whether successful or failed.
If the task failed with an error, the `Future` rejects with that exception.
The remaining tasks **continue running**.

If a completed task already exists, the `Future` resolves immediately.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`.

## Return Value

`Async\Future` --- a future result of the first completed task.
Call `->await()` to get the value.

## Errors

- Throws `Async\AsyncException` if the group is empty.
- The `Future` rejects with the task's exception if the first completed task failed with an error.

## Examples

### Example #1 First response

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### Example #2 Hedged requests with timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "No replica responded within 2 seconds\n";
    }
});
```

## See Also

- [TaskGroup::any](/en/docs/reference/task-group/any.html) --- First successful result
- [TaskGroup::all](/en/docs/reference/task-group/all.html) --- All results
