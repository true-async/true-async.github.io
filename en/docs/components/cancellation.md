---
layout: docs
lang: en
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /en/docs/components/cancellation.html
page_title: "Cancellation"
description: "Coroutine cancellation in TrueAsync -- cooperative cancellation, critical sections with protect(), cascading cancellation via Scope, timeouts."
---

# Cancellation

A browser sent a request, but then the user closed the page.
The server continues working on a request that is no longer needed.
It would be good to abort the operation to avoid unnecessary costs.
Or suppose there is a long-running data copy process that needs to be suddenly cancelled.
There are many scenarios where you need to stop operations.
Usually this problem is solved with flag variables or cancellation tokens, which is quite labor-intensive. The code must know
that it might be cancelled, must plan cancellation checkpoints, and correctly handle these situations.

## Cancellable by Design

Most of the time, an application is busy reading data
from databases, files, or the network. Interrupting a read is safe.
Therefore, in `TrueAsync` the following principle applies: **a coroutine can be cancelled at any moment from a waiting state**.
This approach reduces the amount of code, since in most cases, the programmer doesn't need to worry
about cancellation.

## How Cancellation Works

A special exception -- `Cancellation` -- is used to cancel a coroutine.
The `Cancellation` exception or a derived one is thrown at a suspension point (`suspend()`, `await()`, `delay()`).
Execution can also be interrupted during I/O operations or any other blocking operation.

```php
$coroutine = spawn(function() {
    echo "Starting work\n";
    suspend(); // Here the coroutine will receive Cancellation
    echo "This won't happen\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancelled\n";
    throw $e;
}
```

## Cancellation Cannot Be Suppressed

`Cancellation` is a base-level exception, on par with `Error` and `Exception`.
The `catch (Exception $e)` construct won't catch it.

Catching `Cancellation` and continuing work is an error.
You can use `catch Async\AsyncCancellation` to handle special situations,
but you must ensure that you correctly re-throw the exception.
In general, it is recommended to use `finally` for guaranteed resource cleanup:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Three Cancellation Scenarios

The behavior of `cancel()` depends on the coroutine's state:

**The coroutine hasn't started yet** -- it will never start.

```php
$coroutine = spawn(function() {
    echo "Won't execute\n";
});
$coroutine->cancel();
```

**The coroutine is in a waiting state** -- it will wake up with a `Cancellation` exception.

```php
$coroutine = spawn(function() {
    echo "Started work\n";
    suspend(); // Here it will receive Cancellation
    echo "Won't execute\n";
});

suspend();
$coroutine->cancel();
```

**The coroutine has already completed** -- nothing happens.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Not an error, but has no effect
```

## Critical Sections: protect()

Not every operation can be safely interrupted.
If a coroutine has debited money from one account but hasn't yet credited another --
cancellation at this point would lead to data loss.

The `protect()` function defers cancellation until the critical section completes:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // Cancellation will take effect here -- after exiting protect()
});

suspend();
$coroutine->cancel();
```

Inside `protect()`, the coroutine is marked as protected.
If `cancel()` arrives at this moment, the cancellation is saved
but not applied. As soon as `protect()` completes --
the deferred cancellation takes effect immediately.

## Cascading Cancellation via Scope

When a `Scope` is cancelled, all its coroutines and all child scopes are cancelled.
The cascade goes **only top-down** -- cancelling a child scope does not affect the parent or sibling scopes.

### Isolation: Cancelling a Child Doesn't Affect Others

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Cancel only child1
$child1->cancel();

$parent->isCancelled(); // false -- parent is unaffected
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- sibling scope is unaffected
```

### Downward Cascade: Cancelling a Parent Cancels All Descendants

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Cascade: cancels both child1 and child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### A Coroutine Can Cancel Its Own Scope

A coroutine can initiate cancellation of the scope it runs in. Code before the nearest suspension point will continue executing:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Starting\n";
    $scope->cancel();
    echo "This will still execute\n";
    suspend();
    echo "But this won't\n";
});
```

After cancellation, the scope is closed -- launching a new coroutine in it is no longer possible.

## Timeouts

A special case of cancellation is a timeout. The `timeout()` function creates a time limit:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "API didn't respond within 5 seconds\n";
}
```

`TimeoutException` is a subtype of `Cancellation`,
so the coroutine terminates by the same rules.

## Checking the State

A coroutine provides two methods for checking cancellation:

- `isCancellationRequested()` -- cancellation was requested but not yet applied
- `isCancelled()` -- the coroutine has actually stopped

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- not yet processed

suspend();

$coroutine->isCancelled();             // true
```

## Example: Queue Worker with Graceful Shutdown

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // All coroutines will be stopped here
        $this->scope->cancel();
    }
}
```

## What's Next?

- [Scope](/en/docs/components/scope.html) -- managing groups of coroutines
- [Coroutines](/en/docs/components/coroutines.html) -- coroutine lifecycle
- [Channels](/en/docs/components/channels.html) -- data exchange between coroutines
