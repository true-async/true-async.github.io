---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Check whether the coroutine is suspended."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Checks whether the coroutine is suspended. A coroutine becomes suspended when `suspend()` is called, during I/O operations, or while waiting with `await()`.

## Return Value

`bool` -- `true` if the coroutine is suspended.

## Examples

### Example #1 Checking suspension

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // let the coroutine start and suspend

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## See Also

- [Coroutine::isRunning](/en/docs/reference/coroutine/is-running.html) -- Check execution
- [Coroutine::getTrace](/en/docs/reference/coroutine/get-trace.html) -- Call stack of a suspended coroutine
- [suspend()](/en/docs/reference/suspend.html) -- Suspend the current coroutine
