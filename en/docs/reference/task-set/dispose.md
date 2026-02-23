---
layout: docs
lang: en
path_key: "/docs/reference/task-set/dispose.html"
nav_active: docs
permalink: /en/docs/reference/task-set/dispose.html
page_title: "TaskSet::dispose"
description: "Destroy the task set scope."
---

# TaskSet::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::dispose(): void
```

Destroys the set scope, cancelling all coroutines. After calling this, the set is completely unusable.

## Examples

### Example #1 Destroying a set

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask());
    $set->dispose();
});
```

## See Also

- [TaskSet::cancel](/en/docs/reference/task-set/cancel.html) — Cancel tasks
- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set
