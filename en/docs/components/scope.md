---
layout: docs
lang: en
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /en/docs/components/scope.html
page_title: "Scope"
description: "Scope in TrueAsync -- managing coroutine lifetimes, hierarchy, group cancellation, error handling and structured concurrency."
---

# Scope: Managing Coroutine Lifetimes

## The Problem: Explicit Resource Control, Forgotten Coroutines

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// The function returned, but three coroutines are still running!
// Who is watching them? When will they finish?
// Who will handle exceptions if they occur?
```

One of the common problems in asynchronous programming is coroutines accidentally "forgotten" by the developer.
They are launched, perform work, but nobody monitors their lifecycle.
This can lead to resource leaks, incomplete operations, and hard-to-find bugs.
For `stateful` applications, this problem is significant.

## The Solution: Scope

![Scope Concept](../../../assets/docs/scope_concept.jpg)

**Scope** -- a logical space for running coroutines, which can be compared to a sandbox.

The following rules guarantee that coroutines are under control:
* Code always knows which `Scope` it is executing in
* The `spawn()` function creates a coroutine in the current `Scope`
* A `Scope` knows about all coroutines that belong to it

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Wait until all coroutines in scope finish
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Now the function will only return when ALL coroutines have finished
```

## Binding to an Object

`Scope` is convenient to bind to an object to explicitly express ownership of a group of coroutines.
Such semantics directly express the programmer's intent.

```php
class UserService
{
    // Only one unique object will own a unique Scope
    // Coroutines live as long as the UserService object
    private Scope $scope;

    public function __construct() {
        // Create a dome for all service coroutines
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Launch a coroutine inside our dome
        $this->scope->spawn(function() use ($userId) {
            // This coroutine is bound to UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // When the object is deleted, resources are guaranteed to be cleaned up
        // All coroutines inside are automatically cancelled
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Delete the service - all its coroutines are automatically cancelled
unset($service);
```

## Scope Hierarchy

A scope can contain other scopes. When a parent scope is cancelled,
all child scopes and their coroutines are also cancelled.

This approach is called **structured concurrency**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Main task\n";

    // Create a child scope
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Subtask 1\n";
    });

    $childScope->spawn(function() {
        echo "Subtask 2\n";
    });

    // Wait for subtasks to complete
    $childScope->awaitCompletion();

    echo "All subtasks done\n";
});

$mainScope->awaitCompletion();
```

If you cancel `$mainScope`, all child scopes will also be cancelled. The entire hierarchy.

## Cancelling All Coroutines in a Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Also working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Me too!\n";
    }
});

// Works for 3 seconds
Async\sleep(3000);

// Cancel ALL coroutines in scope
$scope->cancel();

// Both coroutines will receive AsyncCancellation
```

## Error Handling in Scope

When a coroutine inside a scope fails with an error, the scope can catch it:

```php
$scope = new Async\Scope();

// Set up an error handler
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Error in scope: " . $e->getMessage() . "\n";
    // Can log it, send to Sentry, etc.
});

$scope->spawn(function() {
    throw new Exception("Something broke!");
});

$scope->spawn(function() {
    echo "I'm working fine\n";
});

$scope->awaitCompletion();

// Output:
// Error in scope: Something broke!
// I'm working fine
```

## Finally: Guaranteed Cleanup

Even if a scope is cancelled, finally blocks will execute:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Starting work\n";
        Async\sleep(10000); // Long operation
        echo "Finished\n"; // Won't execute
    } finally {
        // This is GUARANTEED to execute
        echo "Cleaning up resources\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Cancel after one second

// Output:
// Starting work
// Cleaning up resources
```

## TaskGroup: Scope with Results

`TaskGroup` -- a specialized scope for parallel task execution
with result aggregation. It supports concurrency limits,
named tasks, and three waiting strategies:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Get all results (waits for all tasks to complete)
$results = await($group->all());

// Or get the first completed result
$first = await($group->race());

// Or the first successful one (ignoring errors)
$any = await($group->any());
```

Tasks can be added with keys and iterated as they complete:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Iterate over results as they become ready
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Task $key failed: {$error->getMessage()}\n";
    } else {
        echo "Task $key: $result\n";
    }
}
```

## Global Scope: There's Always a Parent

If you don't specify a scope explicitly, the coroutine is created in the **global scope**:

```php
// Without specifying a scope
spawn(function() {
    echo "I'm in global scope\n";
});

// Same as:
Async\Scope::global()->spawn(function() {
    echo "I'm in global scope\n";
});
```

Global scope lives for the entire request. When PHP exits, all coroutines in global scope are cancelled gracefully.

## Real-World Example: HTTP Client

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Cancel all active requests
        $this->scope->cancel();
    }

    public function __destruct() {
        // When the client is destroyed, all requests are automatically cancelled
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Cancel all requests
$client->cancelAll();

// Or just destroy the client - same effect
unset($client);
```

## Structured Concurrency

`Scope` implements the **Structured Concurrency** principle --
a set of rules for managing concurrent tasks, proven in production runtimes
of `Kotlin`, `Swift`, and `Java`.

### API for Lifetime Management

`Scope` provides the ability to explicitly control the lifetime of a coroutine hierarchy
using the following methods:

| Method                                   | What it does                                                     |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Launches a coroutine inside the Scope                            |
| `$scope->awaitCompletion($cancellation)` | Waits for all coroutines in the Scope to complete                |
| `$scope->cancel()`                       | Sends a cancellation signal to all coroutines                    |
| `$scope->dispose()`                      | Closes the Scope and forcefully cancels all coroutines           |
| `$scope->disposeSafely()`               | Closes the Scope; coroutines are not cancelled but marked zombie |
| `$scope->awaitAfterCancellation()`       | Waits for all coroutines to complete, including zombie ones      |
| `$scope->disposeAfterTimeout(int $ms)`   | Cancels coroutines after a timeout                               |

These methods allow implementing three key patterns:

**1. Parent waits for all child tasks**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* task 1 */ });
$scope->spawn(function() { /* task 2 */ });

// Control won't return until both tasks complete
$scope->awaitCompletion();
```

In Kotlin, the same is done with `coroutineScope { }`,
in Swift -- with `withTaskGroup { }`.

**2. Parent cancels all child tasks**

```php
$scope->cancel();
// All coroutines in $scope will receive a cancellation signal.
// Child Scopes will also be cancelled -- recursively, to any depth.
```

**3. Parent closes the Scope and releases resources**

`dispose()` closes the Scope and forcefully cancels all its coroutines:

```php
$scope->dispose();
// Scope is closed. All coroutines are cancelled.
// New coroutines cannot be added to this Scope.
```

If you need to close the Scope but allow current coroutines to **finish their work**,
use `disposeSafely()` -- coroutines are marked as zombie
(not cancelled, they continue executing, but the Scope is considered finished by active tasks):

```php
$scope->disposeSafely();
// Scope is closed. Coroutines continue working as zombies.
// Scope tracks them but doesn't count them as active.
```

### Error Handling: Two Strategies

An unhandled exception in a coroutine is not lost -- it bubbles up to the parent Scope.
Different runtimes offer different strategies:

| Strategy                                                         | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Fail-together**: one child's error cancels all others          | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (default)                  |
| **Independent children**: one's error doesn't affect others      | `supervisorScope` | separate `Task`         | `$scope->setExceptionHandler(...)` |

The ability to choose a strategy is the key difference from "fire and forget".

### Context Inheritance

Child tasks automatically receive the parent's context:
priority, deadlines, metadata -- without explicitly passing parameters.

In Kotlin, child coroutines inherit the parent's `CoroutineContext` (dispatcher, name, `Job`).
In Swift, child `Task` instances inherit priority and task-local values.

### Where This Already Works

| Language   | API                                                             | In production since |
|------------|-----------------------------------------------------------------|---------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018                |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021                |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview)      |

TrueAsync brings this approach to PHP through `Async\Scope`.

## What's Next?

- [Coroutines](/en/docs/components/coroutines.html) -- how coroutines work
- [Cancellation](/en/docs/components/cancellation.html) -- cancellation patterns
- [Zombie Coroutines](/en/docs/components/zombie-coroutines.html) -- tolerance for third-party code
