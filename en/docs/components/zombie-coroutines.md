---
layout: docs
lang: en
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /en/docs/components/zombie-coroutines.html
page_title: "Zombie Coroutines"
description: "Zombie coroutines in TrueAsync -- tolerance for third-party code, disposeSafely(), disposeAfterTimeout(), managing non-cancellable tasks."
---

# Zombie Coroutines: Fault Tolerance

## The Problem: Code That Can't Be Cancelled

Coroutine cancellation is a cooperative process. The coroutine receives a `Cancellation` exception
at a suspension point and must terminate gracefully. But what if someone made a mistake and created a coroutine in the wrong `Scope`?
Although `TrueAsync` follows the `Cancellation by design` principle, situations may arise where someone wrote code
whose cancellation could lead to an unpleasant outcome.
For example, someone created a background task to send an `email`. The coroutine was cancelled, the `email` was never sent.

High fault tolerance allows significant savings in development time
and minimizes the consequences of errors, if programmers use log analysis to improve application quality.

## The Solution: Zombie Coroutines

To smooth over such situations, `TrueAsync` provides a special approach:
tolerant handling of "stuck" coroutines -- zombie coroutines.

A `zombie` coroutine is a coroutine that:
* Continues execution as normal
* Remains bound to its Scope
* Is not considered active -- the Scope can formally complete without waiting for it
* Does not block `awaitCompletion()`, but blocks `awaitAfterCancellation()`

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // Third-party code -- we don't know how it reacts to cancellation
});

$scope->spawn(function() {
    return myOwnCode(); // Our code -- correctly handles cancellation
});

// disposeSafely() does NOT cancel coroutines, but marks them as zombie
$scope->disposeSafely();
// Scope is closed for new coroutines.
// Existing coroutines continue working as zombies.
```

## Three Strategies for Scope Termination

`TrueAsync` provides three ways to close a `Scope`, designed for different levels of trust in the code:

### `dispose()` -- Forced Cancellation

All coroutines receive `Cancellation`. The Scope closes immediately.
Use when you control all code inside the Scope.

```php
$scope->dispose();
// All coroutines are cancelled. Scope is closed.
```

### `disposeSafely()` -- No Cancellation, Coroutines Become Zombies

Coroutines **do not receive** `Cancellation`. They are marked as `zombie` and continue running.
The `Scope` is considered closed -- new coroutines cannot be created.

Use when the `Scope` contains "third-party" code and you are not confident about the correctness of cancellation.

```php
$scope->disposeSafely();
// Coroutines continue working as zombies.
// Scope is closed for new tasks.
```

### `disposeAfterTimeout(int $timeout)` -- Cancellation with Timeout

A combination of both approaches: first, coroutines are given time to finish,
then the `Scope` is forcefully cancelled.

```php
$scope->disposeAfterTimeout(5000);
// After 5 seconds, the Scope will send Cancellation to all remaining coroutines.
```

## Waiting for Zombie Coroutines

`awaitCompletion()` waits only for **active** coroutines. Once all coroutines become zombies,
`awaitCompletion()` considers the Scope finished and returns control.

But sometimes you need to wait for **all** coroutines to complete, including zombies.
For this, `awaitAfterCancellation()` exists:

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// Cancel -- coroutines that can't be cancelled will become zombies
$scope->cancel();

// awaitCompletion() will return immediately if only zombies remain
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() will wait for ALL, including zombies
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // Error handler for zombie coroutines
    echo "Zombie error: " . $error->getMessage() . "\n";
});
```

| Method                       | Waits for active | Waits for zombies | Requires cancel() |
|------------------------------|:----------------:|:-----------------:|:------------------:|
| `awaitCompletion()`          |       Yes        |        No         |         No         |
| `awaitAfterCancellation()`   |       Yes        |        Yes        |        Yes         |

`awaitAfterCancellation()` can only be called after `cancel()` -- otherwise an error will occur.
This makes sense: zombie coroutines appear precisely as a result of cancellation with the `DISPOSE_SAFELY` flag.

## How Zombies Work Internally

When a coroutine is marked as `zombie`, the following happens:

1. The coroutine receives the `ZOMBIE` flag
2. The active coroutine counter in the `Scope` decreases by 1
3. The `zombie` coroutine counter increases by 1
4. The `Scope` checks whether any active coroutines remain and can notify waiters about completion

```
Scope
+-- active_coroutines_count: 0    <-- decreases
+-- zombie_coroutines_count: 2    <-- increases
+-- coroutine A (zombie)          <-- continues running
+-- coroutine B (zombie)          <-- continues running
```

A `zombie` coroutine is **not detached** from the `Scope`. It remains in its coroutine list,
but is not counted as active. When a `zombie` coroutine finally completes,
it is removed from the `Scope`, and the `Scope` checks whether it can fully release resources.

## How the Scheduler Handles Zombies

The `Scheduler` maintains two independent coroutine counts:

1. **Global active coroutine counter** (`active_coroutine_count`) -- used for quick checks
   on whether anything needs to be scheduled
2. **Coroutine registry** (`coroutines` hash table) -- contains **all** coroutines that are still running,
   including `zombies`

When a coroutine is marked as `zombie`:
* The global active coroutine counter **decreases** -- the Scheduler considers there is less active work
* The coroutine **remains** in the registry -- the `Scheduler` continues managing its execution

The application continues running as long as the active coroutine counter is greater than zero. An important consequence follows:
`Zombie` coroutines do not prevent the application from shutting down, since they are not considered active.
If there are no more active coroutines, the application terminates and even `zombie` coroutines will be cancelled.

## Inheriting the Safely Flag

By default, a `Scope` is created with the `DISPOSE_SAFELY` flag.
This means: if the `Scope` is destroyed (e.g., in an object's destructor),
coroutines become `zombies` rather than being cancelled.

A child `Scope` inherits this flag from its parent:

```php
$parent = new Async\Scope();
// parent has the DISPOSE_SAFELY flag by default

$child = Async\Scope::inherit($parent);
// child also has the DISPOSE_SAFELY flag
```

If you want forced cancellation on destruction, use `asNotSafely()`:

```php
$scope = (new Async\Scope())->asNotSafely();
// Now when the Scope object is destroyed,
// coroutines will be forcefully cancelled rather than marked as zombies
```

## Example: HTTP Server with Middleware

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // Launch middleware -- this could be third-party code
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // Main processing -- our code
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // On destruction: middleware may not be ready for cancellation,
        // so we use disposeSafely() (default behavior).
        // Zombie coroutines will finish on their own.
        $this->scope->disposeSafely();
    }
}
```

## Example: Handler with Time Limit

```php
$scope = new Async\Scope();

// Launch tasks with third-party code
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// Give 10 seconds to finish, then force cancellation
$scope->disposeAfterTimeout(10000);
```

## When Zombies Become a Problem

`Zombie` coroutines are a compromise. They solve the third-party code problem
but can lead to resource leaks.

Therefore, `disposeAfterTimeout()` or a `Scope` with explicit coroutine cancellation is the best choice for production:
it gives third-party code time to finish but guarantees cancellation in case of hanging.

## Summary

| Method                     | Cancels coroutines | Coroutines finish  | Scope closed |
|---------------------------|:------------------:|:------------------:|:------------:|
| `dispose()`               |        Yes         |         No         |     Yes      |
| `disposeSafely()`         |         No         |  Yes (as zombies)  |     Yes      |
| `disposeAfterTimeout(ms)` |  After timeout     |  Until timeout     |     Yes      |

## Logging Zombie Coroutines

In future versions, `TrueAsync` intends to provide a mechanism for logging zombie coroutines, which will allow
developers to troubleshoot issues related to stuck tasks.

## What's Next?

- [Scope](/en/docs/components/scope.html) -- managing groups of coroutines
- [Cancellation](/en/docs/components/cancellation.html) -- cancellation patterns
- [Coroutines](/en/docs/components/coroutines.html) -- coroutine lifecycle
