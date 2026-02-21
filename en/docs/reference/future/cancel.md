---
layout: docs
lang: en
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /en/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Cancels the Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Cancels the `Future`. All coroutines awaiting this Future via `await()` will receive a `CancelledException`. If the `$cancellation` parameter is provided, it will be used as the cancellation reason.

## Parameters

`cancellation` — a custom cancellation exception. If `null`, the default `CancelledException` is used.

## Return value

The function does not return a value.

## Examples

### Example #1 Basic Future cancellation

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// A coroutine awaiting the result
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// Cancel the Future
$future->cancel();
```

### Example #2 Cancellation with a custom reason

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## See also

- [Future::isCancelled](/en/docs/reference/future/is-cancelled.html) — Check if the Future is cancelled
- [Future::await](/en/docs/reference/future/await.html) — Await the result
- [Future::catch](/en/docs/reference/future/catch.html) — Handle Future errors
