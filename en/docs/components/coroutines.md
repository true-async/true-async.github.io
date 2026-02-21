---
layout: docs
lang: en
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /en/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "The Async\\Coroutine class -- creation, lifecycle, states, cancellation, debugging and complete method reference."
---

# The Async\Coroutine Class

(PHP 8.6+, True Async 1.0)

## Coroutines in TrueAsync

When a regular function calls an I/O operation like `fread` or `fwrite` (reading a file or making a network request),
control is passed to the operating system kernel, and `PHP` blocks until the operation completes.

But if a function is executed inside a coroutine and calls an I/O operation,
only the coroutine blocks, not the entire `PHP` process.
Meanwhile, control is passed to another coroutine, if one exists.

In this sense, coroutines are very similar to operating system threads,
but they are managed in user space rather than by the OS kernel.

Another important difference is that coroutines share CPU time by taking turns,
voluntarily yielding control, while threads can be preempted at any moment.

TrueAsync coroutines execute within a single thread
and are not parallel. This leads to several important consequences:
- Variables can be freely read and modified from different coroutines without locks, since they don't execute simultaneously.
- Coroutines cannot simultaneously use multiple CPU cores.
- If one coroutine performs a long synchronous operation, it blocks the entire process, since it doesn't yield control to other coroutines.

## Creating a Coroutine

A coroutine is created using the `spawn()` function:

```php
use function Async\spawn;

// Create a coroutine
$coroutine = spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

// $coroutine is an object of type Async\Coroutine
// The coroutine is already scheduled for execution
```

Once `spawn` is called, the function will be executed asynchronously by the scheduler as soon as possible.

## Passing Parameters

The `spawn` function accepts a `callable` and any parameters that will be passed to that function
when it starts.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Pass the function and parameters
$coroutine = spawn(fetchUser(...), 123);
```

## Getting the Result

To get the result of a coroutine, use `await()`:

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Done!";
});

echo "Coroutine started\n";

// Wait for the result
$result = await($coroutine);

echo "Result: $result\n";
```

**Important:** `await()` blocks the execution of the **current coroutine**, but not the entire `PHP` process.
Other coroutines continue running.

## Coroutine Lifecycle

A coroutine goes through several states:

1. **Queued** -- created via `spawn()`, waiting to be started by the scheduler
2. **Running** -- currently executing
3. **Suspended** -- paused, waiting for I/O or `suspend()`
4. **Completed** -- finished execution (with a result or an exception)
5. **Cancelled** -- cancelled via `cancel()`

### Checking the State

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - waiting to start
var_dump($coro->isStarted());   // false - hasn't started yet

suspend(); // let the coroutine start

var_dump($coro->isStarted());    // true - the coroutine has started
var_dump($coro->isRunning());    // false - not currently executing
var_dump($coro->isSuspended());  // true - suspended, waiting for something
var_dump($coro->isCompleted());  // false - hasn't finished yet
var_dump($coro->isCancelled());  // false - not cancelled
```

## Suspension: suspend

The `suspend` keyword stops the coroutine and passes control to the scheduler:

```php
spawn(function() {
    echo "Before suspend\n";

    suspend(); // We stop here

    echo "After suspend\n";
});

echo "Main code\n";

// Output:
// Before suspend
// Main code
// After suspend
```

The coroutine stopped at `suspend`, control returned to the main code. Later, the scheduler resumed the coroutine.

### suspend with waiting

Typically `suspend` is used to wait for some event:

```php
spawn(function() {
    echo "Making an HTTP request\n";

    $data = file_get_contents('https://api.example.com/data');
    // Inside file_get_contents, suspend is implicitly called
    // While the network request is in progress, the coroutine is suspended

    echo "Got data: $data\n";
});
```

PHP automatically suspends the coroutine on I/O operations. You don't need to manually write `suspend`.

## Cancelling a Coroutine

```php
$coro = spawn(function() {
    try {
        echo "Starting long work\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Sleep 100ms
            echo "Iteration $i\n";
        }

        echo "Finished\n";
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled during iteration\n";
    }
});

// Let the coroutine work for 1 second
Async\sleep(1000);

// Cancel it
$coro->cancel();

// The coroutine will receive AsyncCancellation at the next await/suspend
```

**Important:** Cancellation works cooperatively. The coroutine must check for cancellation (via `await`, `sleep`, or `suspend`). You cannot forcefully kill a coroutine.

## Multiple Coroutines

Launch as many as you want:

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Wait for all coroutines
$results = array_map(fn($t) => await($t), $tasks);

echo "Loaded " . count($results) . " results\n";
```

All 10 requests run concurrently. Instead of 10 seconds (one second each), it completes in ~1 second.

## Error Handling

Errors in coroutines are handled with regular `try-catch`:

```php
$coro = spawn(function() {
    throw new Exception("Oops!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Caught error: " . $e->getMessage() . "\n";
}
```

If the error is not caught, it bubbles up to the parent scope:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Error in coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Error bubbled up to scope: " . $e->getMessage() . "\n";
}
```

## Coroutine = Object

A coroutine is a full-fledged PHP object. You can pass it anywhere:

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Long work
        Async\sleep(10000);
        return "Result";
    });
}

$task = startBackgroundTask();

// Pass to another function
processTask($task);

// Or store in an array
$tasks[] = $task;

// Or in an object property
$this->backgroundTask = $task;
```

## Nested Coroutines

Coroutines can launch other coroutines:

```php
spawn(function() {
    echo "Parent coroutine\n";

    $child1 = spawn(function() {
        echo "Child coroutine 1\n";
        return "Result 1";
    });

    $child2 = spawn(function() {
        echo "Child coroutine 2\n";
        return "Result 2";
    });

    // Wait for both child coroutines
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Parent received: $result1 and $result2\n";
});
```

## Finally: Guaranteed Cleanup

Even if a coroutine is cancelled, `finally` will execute:

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // May be cancelled here
        }
    } finally {
        // File will be closed no matter what
        fclose($file);
        echo "File closed\n";
    }
});
```

## Debugging Coroutines

### Get the Call Stack

```php
$coro = spawn(function() {
    doSomething();
});

// Get the coroutine's call stack
$trace = $coro->getTrace();
print_r($trace);
```

### Find Out Where a Coroutine Was Created

```php
$coro = spawn(someFunction(...));

// Where spawn() was called
echo "Coroutine created at: " . $coro->getSpawnLocation() . "\n";
// Output: "Coroutine created at: /app/server.php:42"

// Or as an array [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Find Out Where a Coroutine Is Suspended

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // suspends here
});

suspend(); // let the coroutine start

echo "Suspended at: " . $coro->getSuspendLocation() . "\n";
// Output: "Suspended at: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Awaiting Information

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Find out what the coroutine is waiting for
$info = $coro->getAwaitingInfo();
print_r($info);
```

Very useful for debugging -- you can immediately see where a coroutine came from and where it stopped.

## Coroutines vs Threads

| Coroutines                    | Threads                       |
|-------------------------------|-------------------------------|
| Lightweight                   | Heavyweight                   |
| Fast creation (<1us)          | Slow creation (~1ms)          |
| Single OS thread              | Multiple OS threads           |
| Cooperative multitasking      | Preemptive multitasking       |
| No race conditions            | Race conditions possible      |
| Requires await points         | Can be preempted anywhere     |
| For I/O operations            | For CPU-bound computations    |

## Deferred Cancellation with protect()

If a coroutine is inside a protected section via `protect()`, cancellation is deferred until the protected block completes:

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Critical operation -- cancellation is deferred
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // Cancellation will happen here, after exiting protect()
    echo "Result: $result\n";
});

suspend();

$coro->cancel(); // Cancellation is deferred -- protect() will complete fully
```

The `isCancellationRequested()` flag becomes `true` immediately, while `isCancelled()` only becomes `true` after the coroutine actually terminates.

## Class Overview

```php
final class Async\Coroutine implements Async\Completable {

    /* Identification */
    public getId(): int

    /* Priority */
    public asHiPriority(): Coroutine

    /* Context */
    public getContext(): Async\Context

    /* Result and errors */
    public getResult(): mixed
    public getException(): mixed

    /* State */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Control */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Debugging */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Contents

- [Coroutine::getId](/en/docs/reference/coroutine/get-id.html) -- Get the unique coroutine identifier
- [Coroutine::asHiPriority](/en/docs/reference/coroutine/as-hi-priority.html) -- Mark the coroutine as high-priority
- [Coroutine::getContext](/en/docs/reference/coroutine/get-context.html) -- Get the coroutine's local context
- [Coroutine::getResult](/en/docs/reference/coroutine/get-result.html) -- Get the execution result
- [Coroutine::getException](/en/docs/reference/coroutine/get-exception.html) -- Get the coroutine's exception
- [Coroutine::isStarted](/en/docs/reference/coroutine/is-started.html) -- Check if the coroutine has started
- [Coroutine::isQueued](/en/docs/reference/coroutine/is-queued.html) -- Check if the coroutine is queued
- [Coroutine::isRunning](/en/docs/reference/coroutine/is-running.html) -- Check if the coroutine is currently running
- [Coroutine::isSuspended](/en/docs/reference/coroutine/is-suspended.html) -- Check if the coroutine is suspended
- [Coroutine::isCompleted](/en/docs/reference/coroutine/is-completed.html) -- Check if the coroutine has completed
- [Coroutine::isCancelled](/en/docs/reference/coroutine/is-cancelled.html) -- Check if the coroutine was cancelled
- [Coroutine::isCancellationRequested](/en/docs/reference/coroutine/is-cancellation-requested.html) -- Check if cancellation was requested
- [Coroutine::cancel](/en/docs/reference/coroutine/cancel.html) -- Cancel the coroutine
- [Coroutine::finally](/en/docs/reference/coroutine/on-finally.html) -- Register a completion handler
- [Coroutine::getTrace](/en/docs/reference/coroutine/get-trace.html) -- Get the call stack of a suspended coroutine
- [Coroutine::getSpawnFileAndLine](/en/docs/reference/coroutine/get-spawn-file-and-line.html) -- Get the file and line where the coroutine was created
- [Coroutine::getSpawnLocation](/en/docs/reference/coroutine/get-spawn-location.html) -- Get the creation location as a string
- [Coroutine::getSuspendFileAndLine](/en/docs/reference/coroutine/get-suspend-file-and-line.html) -- Get the file and line where the coroutine was suspended
- [Coroutine::getSuspendLocation](/en/docs/reference/coroutine/get-suspend-location.html) -- Get the suspension location as a string
- [Coroutine::getAwaitingInfo](/en/docs/reference/coroutine/get-awaiting-info.html) -- Get awaiting information

## What's Next

- [Scope](/en/docs/components/scope.html) -- managing groups of coroutines
- [Cancellation](/en/docs/components/cancellation.html) -- details about cancellation and protect()
- [spawn()](/en/docs/reference/spawn.html) -- complete documentation
- [await()](/en/docs/reference/await.html) -- complete documentation
