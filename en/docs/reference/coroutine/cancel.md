---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Cancel coroutine execution."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancels the coroutine execution. The coroutine will receive an `AsyncCancellation` exception at the next suspension point (`suspend`, `await`, `delay`, etc.).

Cancellation works cooperatively -- the coroutine is not interrupted instantly. If the coroutine is inside `protect()`, cancellation is deferred until the protected section completes.

## Parameters

**cancellation**
: The exception serving as the cancellation reason. If `null`, a default `AsyncCancellation` is created.

## Examples

### Example #1 Basic cancellation

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Example #2 Cancellation with reason

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout exceeded"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout exceeded"
}
```

### Example #3 Cancellation before start

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// Cancel before the scheduler starts the coroutine
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## See Also

- [Coroutine::isCancelled](/en/docs/reference/coroutine/is-cancelled.html) -- Check cancellation
- [Coroutine::isCancellationRequested](/en/docs/reference/coroutine/is-cancellation-requested.html) -- Check cancellation request
- [Cancellation](/en/docs/components/cancellation.html) -- Cancellation concept
- [protect()](/en/docs/reference/protect.html) -- Protected section
