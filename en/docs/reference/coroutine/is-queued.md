---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Check whether the coroutine is in the scheduler queue."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Checks whether the coroutine is in the scheduler queue for execution.

## Return Value

`bool` -- `true` if the coroutine is in the queue.

## Examples

### Example #1 Queue state

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- waiting to start

suspend(); // let the scheduler start the coroutine

// Coroutine started but remains in queue after internal suspend()
var_dump($coroutine->isStarted()); // bool(true)
```

## See Also

- [Coroutine::isStarted](/en/docs/reference/coroutine/is-started.html) -- Check if started
- [Coroutine::isSuspended](/en/docs/reference/coroutine/is-suspended.html) -- Check suspension
