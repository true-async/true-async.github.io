---
layout: docs
lang: en
path_key: "/docs/reference/task-set/join-next.html"
nav_active: docs
permalink: /en/docs/reference/task-set/join-next.html
page_title: "TaskSet::joinNext"
description: "Get the result of the first completed task with automatic removal from the set."
---

# TaskSet::joinNext

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinNext(): Async\Future
```

Returns a `Future` that resolves with the result of the first completed task — whether successful or failed.
If the task finished with an error, the `Future` rejects with that exception.

**After delivering the result, the entry is automatically removed from the set**, and `count()` decreases by 1.

Remaining tasks continue running.

If a completed task already exists, the `Future` resolves immediately.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`.

## Return Value

`Async\Future` — a future result of the first completed task.
Call `->await()` to get the value.

## Errors

- Throws `Async\AsyncException` if the set is empty.
- The `Future` rejects with the task's exception if the first completed task failed with an error.

## Examples

### Example #1 Sequential result processing

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => fetchUser(1));
    $set->spawn(fn() => fetchUser(2));
    $set->spawn(fn() => fetchUser(3));

    echo "before: count=" . $set->count() . "\n"; // 3

    $first = $set->joinNext()->await();
    echo "after first: count=" . $set->count() . "\n"; // 2

    $second = $set->joinNext()->await();
    echo "after second: count=" . $set->count() . "\n"; // 1
});
```

### Example #2 Processing loop

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    foreach ($urls as $url) {
        $set->spawn(fn() => httpClient()->get($url)->getBody());
    }
    $set->seal();

    while ($set->count() > 0) {
        try {
            $body = $set->joinNext()->await();
            processResponse($body);
        } catch (\Throwable $e) {
            log("Error: {$e->getMessage()}");
        }
    }
});
```

### Example #3 With timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());

    try {
        $result = $set->joinNext()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "No task completed within 5 seconds\n";
    }
});
```

## See Also

- [TaskSet::joinAny](/en/docs/reference/task-set/join-any.html) — First successful result
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — All results
- [TaskGroup::race](/en/docs/reference/task-group/race.html) — Equivalent without auto-cleanup
