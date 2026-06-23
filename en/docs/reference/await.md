---
layout: docs
lang: en
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /en/docs/reference/await.html
page_title: "await()"
description: "await() — waiting for a coroutine or Future to complete. Full documentation: parameters, exceptions, examples."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Waits for a coroutine, `Async\Future`, or any other `Async\Completable` to complete.
Returns the result or throws an exception.

## Description

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Suspends execution of the current coroutine until the specified `Async\Completable` `$awaitable` completes (or until `$cancellation` triggers, if provided) and returns the result.
If the `awaitable` has already completed, the result is returned immediately.

If the coroutine finished with an exception, it will be propagated to the calling code.

## Parameters

**`awaitable`**
An object implementing the `Async\Completable` interface (extends `Async\Awaitable`). Typically this is:
- `Async\Coroutine` - the result of calling `spawn()`
- `Async\TaskGroup` - a task group
- `Async\Future` - a future value

**`cancellation`**
An optional `Async\Completable` object; when it completes, the waiting will be cancelled.

## Return Values

Returns the value that the coroutine returned. The return type depends on the coroutine.

## Errors/Exceptions

If the coroutine finished with an exception, `await()` will rethrow that exception.

If the coroutine was cancelled, `Async\AsyncCancellation` will be thrown.

If the cancellation token (`$cancellation`) triggered, `Async\OperationCanceledException` will be thrown. The original exception from the token is available via `$e->getPrevious()`. This allows you to distinguish a token trigger from an exception thrown by the awaitable object itself.

## How the exception is delivered

When a coroutine finishes with an exception, **the result "settles" on its handle** until someone
picks it up. The behaviour is symmetric to `Async\Future` and depends on whether anyone besides
the Scheduler is holding the coroutine handle:

- **The handle is held** (`$coro = spawn(...)`, the coroutine is in an array, passed into
  `await_all()`, etc.) — the exception stays on the handle and waits. Any `await($coro)` retrieves
  it, even long after the coroutine has finished.
- **No one holds the handle** (fire-and-forget — `spawn(...)` without saving the result) — the
  exception surfaces when the handle is destroyed, through the fire-and-forget safety net.

The key practical consequence — **`await` catches the exception even after a race**:

```php
use function Async\spawn;
use function Async\await;

$coro = spawn(function () {
    throw new RuntimeException('boom');
});

// The coroutine may finish before we reach await — that's fine.
// The exception will quietly wait for us here:
try {
    await($coro);
} catch (RuntimeException $e) {
    echo "caught: ", $e->getMessage(), "\n"; // caught: boom
}
```

The same applies to `await_all()`, `await_any_or_fail()`, and other `await_*()` calls: you can
collect coroutines into an array, let them run in parallel, and then await them. Exceptions are
gathered through `await`.

> When a parent scope dies before its coroutine, the child coroutines receive `AsyncCancellation`
> per spec. That branch is handled separately and does not depend on who holds the handle.

## Examples

### Example #1 Basic usage of await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### Example #2 Sequential waiting

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### Example #3 Exception handling

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Failed to fetch data");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Data received\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### Example #4 await with TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// Get an array of all results
$results = await($taskGroup);
print_r($results); // Array of results
?>
```

### Example #5 Multiple await on the same coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// The first await will wait for the result
$result1 = await($coroutine);
echo "$result1\n";

// Subsequent awaits return the result instantly
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Example #6 await inside a coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Parent coroutine started\n";

    $child = spawn(function() {
        echo "Child coroutine running\n";
        Async\delay(1000);
        return "Result from child";
    });

    echo "Waiting for child...\n";
    $result = await($child);
    echo "Received: $result\n";
});

echo "Main code continues\n";
?>
```

## Changelog

| Version  | Description                     |
|----------|---------------------------------|
| 1.0.0    | Added the `await()` function   |

## See Also

- [spawn()](/en/docs/reference/spawn.html) - Launching a coroutine
- [suspend()](/en/docs/reference/suspend.html) - Suspending execution
