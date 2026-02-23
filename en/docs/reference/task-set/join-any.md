---
layout: docs
lang: en
path_key: "/docs/reference/task-set/join-any.html"
nav_active: docs
permalink: /en/docs/reference/task-set/join-any.html
page_title: "TaskSet::joinAny"
description: "Get the result of the first successfully completed task with automatic removal from the set."
---

# TaskSet::joinAny

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAny(): Async\Future
```

Returns a `Future` that resolves with the result of the first *successfully* completed task.
Tasks that finished with an error are skipped.

**After delivering the result, the entry is automatically removed from the set.**

Remaining tasks continue running.

If all tasks finished with errors, the `Future` rejects with `CompositeException`.

The returned `Future` supports a cancellation token via `await(?Completable $cancellation)`.

## Return Value

`Async\Future` — a future result of the first successful task.
Call `->await()` to get the value.

## Errors

- Throws `Async\AsyncException` if the set is empty.
- The `Future` rejects with `Async\CompositeException` if all tasks finished with errors.

## Examples

### Example #1 First successful result

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("fail 1"));
    $set->spawn(fn() => throw new \RuntimeException("fail 2"));
    $set->spawn(fn() => "success!");

    $result = $set->joinAny()->await();
    echo $result . "\n"; // "success!"
    echo $set->count() . "\n"; // 2 (failed tasks remain)
});
```

### Example #2 All tasks failed

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("err 1"));
    $set->spawn(fn() => throw new \RuntimeException("err 2"));

    $set->seal();

    try {
        $set->joinAny()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errors\n"; // "2 errors"
    }
});
```

### Example #3 Resilient search

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => searchGoogle($query));
    $set->spawn(fn() => searchBing($query));
    $set->spawn(fn() => searchDuckDuckGo($query));

    $result = $set->joinAny()->await(Async\timeout(3.0));
    echo "Found, active: {$set->count()}\n";
});
```

## See Also

- [TaskSet::joinNext](/en/docs/reference/task-set/join-next.html) — First completed (success or error)
- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — All results
- [TaskGroup::any](/en/docs/reference/task-group/any.html) — Equivalent without auto-cleanup
