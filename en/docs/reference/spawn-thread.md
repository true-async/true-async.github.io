---
layout: docs
lang: en
path_key: "/docs/reference/spawn-thread.html"
nav_active: docs
permalink: /en/docs/reference/spawn-thread.html
page_title: "spawn_thread()"
description: "spawn_thread() — run a closure in a new OS thread. Full documentation: parameters, data transfer, exceptions, examples."
---

# spawn_thread

(PHP 8.6+, True Async 1.0)

`spawn_thread()` — runs a closure in a **separate parallel thread** with its own isolated PHP environment.
Returns an `Async\Thread` that implements `Completable`, so the thread can be awaited via `await()`.

## Description

```php
Async\spawn_thread(
    \Closure $task,
    bool $inherit = true,
    ?\Closure $bootloader = null
): Async\Thread
```

Creates a new OS thread, starts a separate PHP request inside it, optionally runs `$bootloader`,
then executes `$task`. The value returned from `$task` becomes the thread's result and is accessible
via `await()` or `Thread::getResult()`.

## Parameters

**`task`**
: The closure executed in the receiver thread. Can capture variables via `use (...)` — they are
deep-copied through shared memory at thread creation and come alive in the receiver thread's memory.

**`inherit`**
: Reserved for future use. The parameter is accepted but does not currently affect thread behavior —
the receiver thread always starts with a fresh, isolated environment.
The flag will remain in the signature until inheritance of classes and functions from the parent is supported.

**`bootloader`**
: An optional closure executed **first** in the receiver thread, before the variables from `use(...)`
of the main `$task` are loaded. Used to prepare the thread environment: registering autoloaders,
declaring classes, initializing ini settings, loading libraries. The bootloader takes no parameters;
its return value is ignored.

## Return Value

An `Async\Thread` object representing the running thread. Implements `Completable`, so it can be used
with `await()`, `await_all()`, `await_any()`, `Task\Group`, and so on.

## Exceptions

- `Async\ThreadTransferException` — thrown **in the parent** if one of the variables captured via
  `use(...)` contains a non-transferable type (`stdClass` with dynamic properties, a PHP reference,
  a resource, etc.).
- `Async\RemoteException` — thrown on `await()` if `$task` completed with an error. Wraps the
  original exception; `getRemoteClass()` and `getRemoteException()` provide access to the details.

## Examples

### Example #1. Heavy work in a separate thread

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker in the main coroutine — shows that the main program does not stall
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

The ticker runs concurrently with the CPU-bound work — the main program does not stall.

### Example #2. Variable passing and identity

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// The class is not inherited into the thread — declare it via bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(
        task: function() use ($obj, $meta) {
            // The same instance in two variables from use(...)
            echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

            // Mutation through one reference is visible through another
            $obj->name = 'staging';
            echo "meta: ", $meta['ref']->name, "\n";

            return $obj->name;
        },
        bootloader: $boot,
    );

    echo "result: ", await($thread), "\n";
});
```

```
same: yes
meta: staging
result: staging
```

Object identity is preserved across different variables captured by the same closure via `use(...)`.

### Example #3. Exception handling

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

### Example #4. Passing a non-transferable type

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // dynamic properties
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

The exception is thrown **in the parent** during variable copying from `use(...)` — the receiver thread did not even start.

### Example #5. Returning a result via FutureState

If you need to "wake up" a parent `Future` directly from a parallel thread (for example, so that the
same event can be awaited from different places in the main coroutine) — pass a `FutureState`:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        $data = "computed in thread";
        $state->complete($data);
    });

    // The event will arrive in the parent via $future when the thread calls $state->complete()
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

A `FutureState` can be passed to `spawn_thread` **only once** — attempting to pass the same state
to a second thread will throw an exception during transit.

## Notes

- **Closure type** — `$task` must be a `\Closure`. Other callable types (`[object, 'method']`,
  string function names) are not accepted — the transfer mechanism can only transport `Closure`.
- **`use` with `&` (by-reference)** — rejected. A shared reference between threads makes no sense.
- **User-defined classes** are not inherited into the receiver thread automatically. If `$task` uses
  a class declared in the parent script, it must be made available in the thread via `bootloader`
  (load via autoload or declare via `eval`).
- **Static properties of functions and classes** in the receiver thread are its own — any changes
  remain inside the thread and do not leak out.

## See Also

- [`Async\Thread`](/en/docs/components/threads.html) — component documentation
- [`Async\ThreadChannel`](/en/docs/components/thread-channels.html) — channels between threads
- [`await()`](/en/docs/reference/await.html) — awaiting a result
- [`spawn()`](/en/docs/reference/spawn.html) — launching a coroutine (not a thread)
