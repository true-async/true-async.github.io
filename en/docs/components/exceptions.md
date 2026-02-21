---
layout: docs
lang: en
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /en/docs/components/exceptions.html
page_title: "Exceptions"
description: "TrueAsync exception hierarchy -- AsyncCancellation, TimeoutException, DeadlockError and others."
---

# Exceptions

## Hierarchy

TrueAsync defines a specialized exception hierarchy for different types of errors:

```
\Cancellation                              -- base cancellation class (on par with \Error and \Exception)
+-- Async\AsyncCancellation                -- coroutine cancellation

\Error
+-- Async\DeadlockError                    -- deadlock detected

\Exception
+-- Async\AsyncException                   -- general async operation error
|   +-- Async\ServiceUnavailableException  -- service unavailable (circuit breaker)
+-- Async\InputOutputException             -- I/O error
+-- Async\DnsException                     -- DNS resolution error
+-- Async\TimeoutException                 -- operation timeout
+-- Async\PollException                    -- poll operation error
+-- Async\ChannelException                 -- channel error
+-- Async\PoolException                    -- resource pool error
+-- Async\CompositeException               -- container for multiple exceptions
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Thrown when a coroutine is cancelled. `\Cancellation` is the third root `Throwable` class on par with `\Error` and `\Exception`, so regular `catch (\Exception $e)` and `catch (\Error $e)` blocks do **not** accidentally catch cancellation.

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // Gracefully finish work
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Important:** Do not catch `AsyncCancellation` via `catch (\Throwable $e)` without re-throwing -- this violates the cooperative cancellation mechanism.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Thrown when the scheduler detects a deadlock -- a situation where coroutines are waiting for each other and none can proceed.

```php
<?php
use function Async\spawn;
use function Async\await;

// Classic deadlock: two coroutines waiting for each other
$c1 = spawn(function() use (&$c2) {
    await($c2); // waits for c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // waits for c1
});
// DeadlockError: A deadlock was detected
?>
```

Example where a coroutine awaits itself:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // awaits itself
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Base exception for general async operation errors. Used for errors that don't fall into specialized categories.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Thrown when a timeout is exceeded. Created automatically when `timeout()` triggers:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Long operation
    });
    await($coroutine, timeout(1000)); // 1 second timeout
} catch (TimeoutException $e) {
    echo "Operation didn't complete in time\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

General exception for I/O errors: sockets, files, pipes, and other I/O descriptors.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Thrown on DNS resolution errors (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Thrown on poll operation errors on descriptors.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Thrown when the circuit breaker is in the `INACTIVE` state and a service request is rejected without an attempt to execute.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Service is temporarily unavailable\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Thrown on channel operation errors: sending to a closed channel, receiving from a closed channel, etc.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Thrown on resource pool operation errors.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

A container for multiple exceptions. Used when several handlers (e.g., `finally` in Scope) throw exceptions during completion:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Cleanup error 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Cleanup error 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errors: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errors: 2
//   - Cleanup error 1
//   - Cleanup error 2
?>
```

## Recommendations

### Properly Handling AsyncCancellation

```php
<?php
// Correct: catch specific exceptions
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation will NOT be caught here -- it's \Cancellation
    handleError($e);
}
```

```php
<?php
// If you need to catch everything -- always re-throw AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Re-throw
} catch (\Throwable $e) {
    handleError($e);
}
```

### Protecting Critical Sections

Use `protect()` for operations that must not be interrupted by cancellation:

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## See Also

- [Cancellation](/en/docs/components/cancellation.html) -- the coroutine cancellation mechanism
- [protect()](/en/docs/reference/protect.html) -- protection from cancellation
- [Scope](/en/docs/components/scope.html) -- exception handling in scopes
