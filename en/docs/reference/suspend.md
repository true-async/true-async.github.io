---
layout: docs
lang: en
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /en/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — suspend execution of the current coroutine. Full documentation: cooperative multitasking examples."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Suspends execution of the current coroutine

## Description

```php
suspend: void
```

Suspends execution of the current coroutine and yields control to the scheduler.
The coroutine's execution will be resumed later when the scheduler decides to run it.

`suspend()` is a function provided by the True Async extension.

## Parameters

This construct has no parameters.

## Return Values

The function does not return a value.

## Examples

### Example #1 Basic usage of suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Before suspend\n";
    suspend();
    echo "After suspend\n";
});

echo "Main code\n";
?>
```

**Output:**
```
Before suspend
Main code
After suspend
```

### Example #2 Multiple suspends

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine started\n";
?>
```

**Output:**
```
Iteration 1
Coroutine started
Iteration 2
Iteration 3
```

### Example #3 Cooperative multitasking

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // Give other coroutines a chance to run
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**Output:**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### Example #4 Explicit yielding of control

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starting long work\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Computations

        if ($i % 100000 === 0) {
            suspend(); // Periodically yield control
        }
    }

    echo "Work completed\n";
});

spawn(function() {
    echo "Other coroutine is also working\n";
});
?>
```

### Example #5 suspend from nested functions

`suspend()` works from any call depth — it does not need to be called directly from the coroutine:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Nested function: before suspend\n";
    suspend();
    echo "Nested function: after suspend\n";
}

function deeplyNested() {
    echo "Deep call: start\n";
    nestedSuspend();
    echo "Deep call: end\n";
}

spawn(function() {
    echo "Coroutine: before nested call\n";
    deeplyNested();
    echo "Coroutine: after nested call\n";
});

spawn(function() {
    echo "Other coroutine: working\n";
});
?>
```

**Output:**
```
Coroutine: before nested call
Deep call: start
Nested function: before suspend
Other coroutine: working
Nested function: after suspend
Deep call: end
Coroutine: after nested call
```

### Example #6 suspend in a wait loop

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Wait until the flag becomes true
    while (!$ready) {
        suspend(); // Yield control
    }

    echo "Condition met!\n";
});

spawn(function() use (&$ready) {
    echo "Preparing...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Ready!\n";
});
?>
```

**Output:**
```
Preparing...
Ready!
Condition met!
```

## Notes

> **Note:** `suspend()` is a function. Calling it as `suspend` (without parentheses) is incorrect.

> **Note:** In TrueAsync, all executing code is treated as a coroutine,
> so `suspend()` can be called anywhere (including the main script).

> **Note:** After calling `suspend()`, coroutine execution will not resume immediately,
> but when the scheduler decides to run it. The order of coroutine resumption is not guaranteed.

> **Note:** In most cases, explicit use of `suspend()` is not required.
> Coroutines are automatically suspended when performing I/O operations
> (file reads, network requests, etc.).

> **Note:** Using `suspend()`
> in infinite loops without I/O operations can lead to high CPU usage.
> You can also use `Async\timeout()`.

## Changelog

| Version   | Description                       |
|-----------|-----------------------------------|
| 1.0.0     | Added the `suspend()` function    |

## See Also

- [spawn()](/en/docs/reference/spawn.html) - Launching a coroutine
- [await()](/en/docs/reference/await.html) - Waiting for a coroutine result
