---
layout: docs
lang: en
path_key: "/docs/reference/task-set/await-completion.html"
nav_active: docs
permalink: /en/docs/reference/task-set/await-completion.html
page_title: "TaskSet::awaitCompletion"
description: "Wait for all tasks in the set to complete."
---

# TaskSet::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::awaitCompletion(): void
```

Suspends the current coroutine until all tasks in the set are completed.

The set **must** be sealed before calling this method.

Unlike `joinAll()`, this method does not throw exceptions on task errors
and does not return results.

## Errors

Throws `Async\AsyncException` if the set is not sealed.

## Examples

### Example #1 Waiting for completion

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => processFile("a.txt"));
    $set->spawn(fn() => processFile("b.txt"));
    $set->spawn(fn() => throw new \RuntimeException("error"));

    $set->seal();
    $set->awaitCompletion(); // Does not throw even if tasks failed

    echo "All tasks completed\n";
});
```

## See Also

- [TaskSet::joinAll](/en/docs/reference/task-set/join-all.html) — Wait and get results
- [TaskSet::finally](/en/docs/reference/task-set/finally.html) — Completion handler
