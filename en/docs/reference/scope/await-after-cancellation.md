---
layout: docs
lang: en
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /en/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Waits for all coroutines including zombies to complete after scope cancellation."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Waits for **all** coroutines in the scope to complete, including zombie coroutines. Requires a prior call to `cancel()`. This method is used for graceful scope termination when you need to wait until all coroutines (including zombies) finish their work.

## Parameters

`errorHandler` — a callback function for handling zombie coroutine errors. Accepts a `\Throwable` as an argument. If `null`, errors are ignored.

`cancellation` — an `Awaitable` object to interrupt the wait. If `null`, the wait is not time-limited.

## Return Value

No value is returned.

## Examples

### Example #1 Graceful termination with error handling

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// First, cancel
$scope->cancel();

// Then wait for all coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### Example #2 Waiting with a timeout

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie coroutine that takes a long time to finish
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Resource cleanup
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## See Also

- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel all coroutines
- [Scope::awaitCompletion](/en/docs/reference/scope/await-completion.html) — Wait for active coroutines
- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Cancel and close the scope
