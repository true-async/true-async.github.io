---
layout: docs
lang: en
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /en/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Cancels all coroutines in the scope."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Cancels all coroutines belonging to the given scope. Each active coroutine will receive a `CancelledException`. If `$cancellationError` is specified, it will be used as the cancellation reason.

## Parameters

`cancellationError` — a custom cancellation exception. If `null`, the standard `CancelledException` is used.

## Return Value

No value is returned.

## Examples

### Example #1 Basic cancellation

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Long operation
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// Cancel all coroutines
$scope->cancel();
```

### Example #2 Cancellation with a custom error

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## See Also

- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Cancel and close the scope
- [Scope::isCancelled](/en/docs/reference/scope/is-cancelled.html) — Check if the scope is cancelled
- [Scope::awaitAfterCancellation](/en/docs/reference/scope/await-after-cancellation.html) — Wait after cancellation
