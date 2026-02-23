---
layout: docs
lang: en
path_key: "/docs/reference/task-set/is-sealed.html"
nav_active: docs
permalink: /en/docs/reference/task-set/is-sealed.html
page_title: "TaskSet::isSealed"
description: "Check if the set is sealed."
---

# TaskSet::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isSealed(): bool
```

Returns `true` if the set is sealed (`seal()` or `cancel()` was called).

## Return Value

`true` if the set is sealed. `false` otherwise.

## Examples

### Example #1 Checking state

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isSealed() ? "yes\n" : "no\n"; // "no"

    $set->seal();
    echo $set->isSealed() ? "yes\n" : "no\n"; // "yes"
});
```

## See Also

- [TaskSet::seal](/en/docs/reference/task-set/seal.html) — Seal the set
- [TaskSet::isFinished](/en/docs/reference/task-set/is-finished.html) — Check if tasks are finished
