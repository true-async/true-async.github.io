---
layout: docs
lang: en
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /en/docs/reference/signal.html
page_title: "signal()"
description: "signal() — wait for an OS signal with cancellation support via Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Waits for an OS signal. Returns a `Future` that resolves with a `Signal` value when the signal is received.

## Description

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Creates a one-shot OS signal handler. Each call to `signal()` creates a new `Future` that resolves upon the first receipt of the specified signal.
If the `$cancellation` parameter is provided, the `Future` will be rejected when the cancellation triggers (e.g., on timeout).

Multiple calls to `signal()` with the same signal work independently — each will receive a notification.

## Parameters

**`signal`**
An `Async\Signal` enum value specifying the expected signal. For example: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
An optional object implementing `Async\Completable` (e.g., a result of calling `timeout()`). If the cancellation object triggers before the signal arrives, the `Future` will be rejected with the corresponding exception (e.g., `Async\TimeoutException`).

If the cancellation object has already completed at the time of the call, `signal()` immediately returns a rejected `Future`.

## Return Values

Returns `Async\Future<Async\Signal>`. When the signal is received, the `Future` resolves with the `Async\Signal` enum value corresponding to the received signal.

## Errors/Exceptions

- `Async\TimeoutException` — if the timeout triggered before the signal was received.
- `Async\AsyncCancellation` — if cancellation occurred for another reason.

## Examples

### Example #1 Waiting for a signal with timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Signal received: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Signal not received within 5 seconds\n";
}
?>
```

### Example #2 Receiving a signal from another coroutine

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Signal received: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Example #3 Graceful shutdown on SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM received, shutting down...\n";
    graceful_shutdown();
});
?>
```

### Example #4 Already expired timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Timeout has already expired

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Notes

> **Note:** Each call to `signal()` creates a **one-shot** handler. To wait for the same signal again, call `signal()` again.

> **Note:** `Signal::SIGINT` and `Signal::SIGBREAK` work on all platforms, including Windows. Signals `SIGUSR1`, `SIGUSR2`, and other POSIX signals are only available on Unix systems.

> **Note:** `Signal::SIGKILL` and `Signal::SIGSEGV` cannot be caught — this is an operating system limitation.

## Signal

The `Async\Signal` enum defines the available OS signals:

| Value | Signal | Description |
|-------|--------|-------------|
| `Signal::SIGHUP` | 1 | Terminal connection lost |
| `Signal::SIGINT` | 2 | Interrupt (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Quit with core dump |
| `Signal::SIGILL` | 4 | Illegal instruction |
| `Signal::SIGABRT` | 6 | Abnormal termination |
| `Signal::SIGFPE` | 8 | Floating-point arithmetic error |
| `Signal::SIGKILL` | 9 | Unconditional termination |
| `Signal::SIGUSR1` | 10 | User-defined signal 1 |
| `Signal::SIGSEGV` | 11 | Memory access violation |
| `Signal::SIGUSR2` | 12 | User-defined signal 2 |
| `Signal::SIGTERM` | 15 | Termination request |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Abnormal termination (alternative) |
| `Signal::SIGWINCH` | 28 | Terminal window size change |

## See Also

- [timeout()](/en/docs/reference/timeout.html) — create a timeout to limit waiting
- [await()](/en/docs/reference/await.html) — waiting for a Future result
- [graceful_shutdown()](/en/docs/reference/graceful-shutdown.html) — graceful scheduler shutdown
- [Cancellation](/en/docs/components/cancellation.html) — cancellation mechanism
