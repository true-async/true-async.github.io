---
layout: docs
lang: en
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /en/docs/components/future.html
page_title: "Future"
description: "Future in TrueAsync -- a promise of a result, transformation chains map/catch/finally, FutureState and diagnostics."
---

# Future: A Promise of a Result

## What is Future

`Async\Future` is an object representing the result of an operation that may not be ready yet.
Future allows you to:

- Await the result via `await()` or `$future->await()`
- Build transformation chains via `map()`, `catch()`, `finally()`
- Cancel the operation via `cancel()`
- Create already-completed Futures via static factories

Future is similar to `Promise` in JavaScript, but integrated with TrueAsync coroutines.

## Future and FutureState

Future is split into two classes with a clear separation of concerns:

- **`FutureState`** -- a mutable container through which the result is written
- **`Future`** -- a readonly wrapper through which the result is read and transformed

```php
<?php
use Async\Future;
use Async\FutureState;

// Create FutureState -- it owns the state
$state = new FutureState();

// Create Future -- it provides access to the result
$future = new Future($state);

// Pass $future to the consumer
// Pass $state to the producer

// The producer completes the operation
$state->complete(42);

// The consumer gets the result
$result = $future->await(); // 42
?>
```

This separation guarantees that the consumer cannot accidentally complete the Future -- only the holder of `FutureState` has that right.

## Creating a Future

### Via FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Complete in another coroutine
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Static Factories

For creating already-completed Futures:

```php
<?php
use Async\Future;

// Successfully completed Future
$future = Future::completed(42);
$result = $future->await(); // 42

// Future with an error
$future = Future::failed(new \RuntimeException('Something went wrong'));
$result = $future->await(); // throws RuntimeException
?>
```

## Transformation Chains

Future supports three transformation methods, working similarly to Promise in JavaScript:

### map() -- Transforming the Result

Called only on successful completion. Returns a new Future with the transformed result:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Result: $value");

$state->complete(21);

echo $asString->await(); // "Result: 42"
?>
```

### catch() -- Handling Errors

Called only on error. Allows recovery from an exception:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Default value';
});

$state->error(new \RuntimeException('Error'));

echo $safe->await(); // "Default value"
?>
```

### finally() -- Execution on Any Outcome

Always called -- both on success and on error. The parent Future's result is passed to the child unchanged:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Release resources
    echo "Operation completed\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (result is passed unchanged)
?>
```

### Composite Chains

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Unknown')
    ->catch(fn(\Throwable $e) => 'Error: ' . $e->getMessage())
    ->finally(function($value) {
        // Logging
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Independent Subscribers

Each call to `map()` on the same Future creates an **independent** chain. Subscribers do not affect each other:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Two independent chains from the same Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Error Propagation in Chains

If the source Future completes with an error, `map()` is **skipped**, and the error is passed directly to `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "This code won't execute\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recovered: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Source error'));

echo await($result) . "\n"; // "Recovered: Source error"
?>
```

If an exception occurs **inside** `map()`, it is caught by the subsequent `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Error in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Caught: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Caught: Error in map"
?>
```

## Awaiting the Result

### Via the await() Function

```php
<?php
use function Async\await;

$result = await($future);
```

### Via the $future->await() Method

```php
<?php
$result = $future->await();

// With cancellation timeout
$result = $future->await(Async\timeout(5000));
```

## Cancelling a Future

```php
<?php
use Async\AsyncCancellation;

// Cancel with default message
$future->cancel();

// Cancel with a custom error
$future->cancel(new AsyncCancellation('Operation is no longer needed'));
```

## Suppressing Warnings: ignore()

If a Future is not used (neither `await()`, `map()`, `catch()` nor `finally()` was called), TrueAsync will issue a warning.
To explicitly suppress this warning:

```php
<?php
$future->ignore();
```

Also, if a Future completed with an error and that error was not handled, TrueAsync will warn about it. `ignore()` suppresses this warning as well.

## FutureState: Completing the Operation

### complete() -- Successful Completion

```php
<?php
$state->complete($result);
```

### error() -- Completion with an Error

```php
<?php
$state->error(new \RuntimeException('Error'));
```

### Constraints

- `complete()` and `error()` can only be called **once**. A repeated call will throw `AsyncException`.
- After calling `complete()` or `error()`, the Future's state is immutable.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Diagnostics

Both classes (`Future` and `FutureState`) provide diagnostic methods:

```php
<?php
// Check state
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Where the Future was created
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Where the Future was completed
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" or "unknown"

// Awaiting information
$future->getAwaitingInfo(); // array
```

## Practical Example: HTTP Client

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Usage
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## See Also

- [await()](/en/docs/reference/await.html) -- awaiting completion
- [Coroutines](/en/docs/components/coroutines.html) -- the basic unit of concurrency
- [Cancellation](/en/docs/components/cancellation.html) -- the cancellation mechanism
