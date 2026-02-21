---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Check whether cancellation has been requested for the coroutine."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Checks whether cancellation has been requested for the coroutine. Unlike `isCancelled()`, returns `true` immediately after `cancel()` is called, even if the coroutine is still executing inside `protect()`.

## Return Value

`bool` -- `true` if cancellation has been requested.

## Examples

### Example #1 Difference from isCancelled()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// Before cancellation
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Immediately after cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- still in protect()
```

## See Also

- [Coroutine::isCancelled](/en/docs/reference/coroutine/is-cancelled.html) -- Check completed cancellation
- [Coroutine::cancel](/en/docs/reference/coroutine/cancel.html) -- Cancel the coroutine
- [protect()](/en/docs/reference/protect.html) -- Protected section
