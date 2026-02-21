---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Check whether the coroutine has been cancelled."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Checks whether the coroutine has been cancelled **and** completed. Returns `true` only when the cancellation has fully finished.

If the coroutine is inside `protect()`, `isCancelled()` will return `false` until the protected section completes, even if `cancel()` has already been called. To check for a cancellation request, use `isCancellationRequested()`.

## Return Value

`bool` -- `true` if the coroutine has been cancelled and completed.

## Examples

### Example #1 Basic cancellation

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // let the cancellation complete

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Example #2 Deferred cancellation with protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Critical section -- cancellation is deferred
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Cancellation requested but not yet completed
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // let protect() complete

var_dump($coroutine->isCancelled());             // bool(true)
```

## See Also

- [Coroutine::isCancellationRequested](/en/docs/reference/coroutine/is-cancellation-requested.html) -- Check cancellation request
- [Coroutine::cancel](/en/docs/reference/coroutine/cancel.html) -- Cancel the coroutine
- [Cancellation](/en/docs/components/cancellation.html) -- Cancellation concept
