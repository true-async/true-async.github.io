---
layout: docs
lang: en
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /en/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — create a timeout object to limit waiting time."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Creates an `Async\Timeout` object that triggers after the specified number of milliseconds.

## Description

```php
timeout(int $ms): Async\Awaitable
```

Creates a timer that throws `Async\TimeoutException` after `$ms` milliseconds.
Used as a wait time limiter in `await()` and other functions.

## Parameters

**`ms`**
Time in milliseconds. Must be greater than 0.

## Return Values

Returns an `Async\Timeout` object implementing `Async\Completable`.

## Errors/Exceptions

- `ValueError` — if `$ms` <= 0.

## Examples

### Example #1 Timeout on await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "Request did not complete within 3 seconds\n";
}
?>
```

### Example #2 Timeout on a task group

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all requests completed within 5 seconds\n";
}
?>
```

### Example #3 Cancelling a timeout

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// The operation completed faster — cancel the timer
$timer->cancel();
?>
```

## See Also

- [delay()](/en/docs/reference/delay.html) — suspending a coroutine
- [await()](/en/docs/reference/await.html) — waiting with cancellation
