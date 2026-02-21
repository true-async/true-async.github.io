---
layout: docs
lang: en
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /en/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — graceful scheduler shutdown with cancellation of all coroutines."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Initiates a graceful scheduler shutdown. All coroutines receive a cancellation request.

## Description

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Starts the graceful shutdown procedure: all active coroutines are cancelled, and the application continues running until they complete naturally.

## Parameters

**`cancellationError`**
An optional cancellation error to pass to the coroutines. If not specified, a default message is used.

## Return Values

No return value.

## Examples

### Example #1 Handling a termination signal

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Server handling requests
spawn(function() {
    // On receiving a signal — shut down gracefully
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server shutdown'));
    });

    while (true) {
        // Processing requests...
    }
});
?>
```

## Notes

> **Note:** Coroutines created **after** calling `graceful_shutdown()` will be immediately cancelled.

> **Note:** `exit` and `die` automatically trigger a graceful shutdown.

## See Also

- [Cancellation](/en/docs/components/cancellation.html) — cancellation mechanism
- [Scope](/en/docs/components/scope.html) — lifecycle management
