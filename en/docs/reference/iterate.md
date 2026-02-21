---
layout: docs
lang: en
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /en/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — concurrent iteration over an array or Traversable with concurrency control and lifecycle management of spawned coroutines."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Concurrently iterates over an array or `Traversable`, calling a `callback` for each element.

## Description

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Executes `callback` for each element of `iterable` in a separate coroutine.
The `concurrency` parameter allows limiting the number of simultaneously running callbacks.
The function blocks the current coroutine until all iterations complete.

All coroutines spawned via `iterate()` run in an isolated child `Scope`.

## Parameters

**`iterable`**
An array or an object implementing `Traversable` (including generators and `ArrayIterator`).

**`callback`**
A function called for each element. Accepts two arguments: `(mixed $value, mixed $key)`.
If the callback returns `false`, iteration stops.

**`concurrency`**
Maximum number of simultaneously running callbacks. Defaults to `0` — the default limit,
all elements are processed concurrently. A value of `1` means execution in a single coroutine.

**`cancelPending`**
Controls the behavior of child coroutines spawned inside the callback (via `spawn()`) after iteration completes.
- `true` (default) — all unfinished spawned coroutines are cancelled with `AsyncCancellation`.
- `false` — `iterate()` waits for all spawned coroutines to complete before returning.

## Return Values

The function does not return a value.

## Errors/Exceptions

- `Error` — if called outside an async context or from the scheduler context.
- `TypeError` — if `iterable` is not an array and does not implement `Traversable`.
- If the callback throws an exception, iteration stops, remaining coroutines are cancelled, and the exception is propagated to the calling code.

## Examples

### Example #1 Basic array iteration

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "All requests completed\n";
});
?>
```

### Example #2 Limiting concurrency

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Process no more than 10 users simultaneously
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "User $userId loaded\n";
    }, concurrency: 10);

    echo "All users processed\n";
});
?>
```

### Example #3 Stopping iteration by condition

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Processing: $item\n";

        if ($item === 'cherry') {
            return false; // Stop iteration
        }
    });

    echo "Iteration finished\n";
});
?>
```

**Output:**
```
Processing: apple
Processing: banana
Processing: cherry
Iteration finished
```

### Example #4 Iterating over a generator

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: processing value $value\n";
    }, concurrency: 2);

    echo "All tasks completed\n";
});
?>
```

### Example #5 Cancelling spawned coroutines (cancelPending = true)

By default, coroutines spawned via `spawn()` inside the callback are cancelled after iteration completes:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Spawn a background task
        spawn(function() use ($value) {
            try {
                echo "Background task $value started\n";
                suspend();
                suspend();
                echo "Background task $value finished\n"; // Won't execute
            } catch (AsyncCancellation) {
                echo "Background task $value cancelled\n";
            }
        });
    });

    echo "Iteration finished\n";
});
?>
```

**Output:**
```
Background task 1 started
Background task 2 started
Background task 3 started
Background task 1 cancelled
Background task 2 cancelled
Background task 3 cancelled
Iteration finished
```

### Example #6 Waiting for spawned coroutines (cancelPending = false)

If you pass `cancelPending: false`, `iterate()` will wait for all spawned coroutines to complete:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Spawn a background task
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // All background tasks have completed
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Output:**
```
result-1, result-2, result-3
```

### Example #7 Error handling

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error processing element $value");
            }
            echo "Processed: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Caught: " . $e->getMessage() . "\n";
    }
});
?>
```

## Notes

> **Note:** `iterate()` creates an isolated child Scope for all spawned coroutines.

> **Note:** When an array is passed, `iterate()` creates a copy of it before iteration.
> Modifying the original array inside the callback does not affect the iteration.

> **Note:** If the `callback` returns `false`, iteration stops,
> but already running coroutines continue until completion (or cancellation, if `cancelPending = true`).

## Changelog

| Version | Description                        |
|---------|------------------------------------|
| 1.0.0   | Added the `iterate()` function.   |

## See Also

- [spawn()](/en/docs/reference/spawn.html) - Launching a coroutine
- [await_all()](/en/docs/reference/await-all.html) - Waiting for multiple coroutines
- [Scope](/en/docs/components/scope.html) - The Scope concept
- [Cancellation](/en/docs/components/cancellation.html) - Coroutine cancellation
