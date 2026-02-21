---
layout: docs
lang: en
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /en/docs/reference/delay.html
page_title: "delay()"
description: "delay() — suspend a coroutine for a given number of milliseconds."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — Suspends execution of the current coroutine for the specified number of milliseconds.

## Description

```php
delay(int $ms): void
```

Suspends the coroutine, yielding control to the scheduler. After `$ms` milliseconds, the coroutine will be resumed.
Other coroutines continue to execute during the wait.

## Parameters

**`ms`**
Wait time in milliseconds. If `0`, the coroutine simply yields control to the scheduler (similar to `suspend()`, but with queueing).

## Return Values

No return value.

## Examples

### Example #1 Basic usage

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // Wait 1 second
    echo "1 second passed\n";
});
?>
```

### Example #2 Periodic execution

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Checking status...\n";
        delay(5000); // Every 5 seconds
    }
});
?>
```

## Notes

> **Note:** `delay()` does not block the entire PHP process — only the current coroutine is blocked.

> **Note:** `delay()` automatically starts the scheduler if it has not been started yet.

## See Also

- [suspend()](/en/docs/reference/suspend.html) — yield control without delay
- [timeout()](/en/docs/reference/timeout.html) — create a timeout to limit waiting
