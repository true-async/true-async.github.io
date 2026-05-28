---
layout: docs
lang: en
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "Check if the set is closed."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

Returns `true` if the set is closed (`close()` or `cancel()` was called).

## Return Value

`true` if the set is closed. `false` otherwise.

## Examples

### Example #1 Checking state

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "yes\n" : "no\n"; // "no"

    $set->close();
    echo $set->isClosed() ? "yes\n" : "no\n"; // "yes"
});
```

## See Also

- [TaskSet::close](/en/docs/reference/task-set/close.html) — Seal the set
- [TaskSet::isFinished](/en/docs/reference/task-set/is-finished.html) — Check if tasks are finished
