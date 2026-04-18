---
layout: docs
lang: en
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /en/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — running code in a separate parallel thread: data transfer, WeakReference/WeakMap, ThreadChannel, Future between threads."
---

# Async\Thread: running PHP in a separate thread

## Why threads are needed

Coroutines solve the concurrency problem for **I/O-bound** workloads — a single process can handle
thousands of concurrent network or disk waits. But coroutines have a limitation: they all run
**in the same PHP process** and take turns receiving control from the scheduler. If a task is
**CPU-bound** — compression, parsing, cryptography, heavy computation — a single such coroutine
will block the scheduler, and all other coroutines will stall until it finishes.

Threads solve this limitation. `Async\Thread` runs a closure in a **separate parallel thread**
with its **own isolated PHP runtime**: its own set of variables, its own autoloader, its own classes
and functions. Nothing is shared directly between threads — any data is passed **by value**,
through deep copying.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker in the main coroutine — proves that the parallel thread
// does not prevent the main program from continuing
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Heavy computation in a separate thread
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

The ticker calmly completes its 5 "ticks" concurrently with the thread's heavy work — the main
program does not have to wait.

## When to use threads vs coroutines

| Task                                              | Tool                      |
|---------------------------------------------------|---------------------------|
| Many concurrent HTTP/DB/file requests             | Coroutines                |
| Long CPU-bound work (parsing, crypto)             | Threads                   |
| Isolating unstable code                           | Threads                   |
| Parallel work across multiple CPU cores           | Threads                   |
| Data exchange between tasks                       | Coroutines + channels     |

A thread is a **relatively expensive entity**: starting a new thread is an order of magnitude
heavier than starting a coroutine. That is why you do not create thousands of them: the typical
model is a few long-lived worker threads (often equal to the number of CPU cores), or one thread
for a specific heavy task.

## Lifecycle

```php
// Creation — the thread starts and begins executing immediately
$thread = spawn_thread(fn() => compute());

// Waiting for the result. The calling coroutine waits; others continue running
$result = await($thread);

// Or a non-blocking check
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` implements the `Completable` interface, so it can be passed to `await()`,
`await_all()`, `await_any()`, and `Task\Group` — exactly like a regular coroutine.

### States

| Method            | What it checks                                              |
|-------------------|-------------------------------------------------------------|
| `isRunning()`     | The thread is still executing                               |
| `isCompleted()`   | The thread has finished (successfully or with an exception) |
| `isCancelled()`   | The thread was cancelled                                    |
| `getResult()`     | The result if it finished successfully; otherwise `null`    |
| `getException()`  | The exception if it finished with an error; otherwise `null`|

### Exception handling

An exception thrown inside a thread is caught and delivered to the parent wrapped
in `Async\RemoteException`:

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

`getRemoteException()` may return `null` if the exception class could not be loaded in the parent
thread (for example, it is a user-defined class that exists only in the receiving thread).

## Data transfer between threads

This is the most important part of the model. **Everything is transferred by copying** — no shared references.

### What can be transferred

| Type                                                    | Behavior                                                        |
|---------------------------------------------------------|-----------------------------------------------------------------|
| Scalars (`int`, `float`, `string`, `bool`, `null`)      | Copied                                                          |
| Arrays                                                  | Deep copy; nested objects preserve identity                     |
| Objects with declared properties (`public $x`, etc.)   | Deep copy; re-created from scratch on the receiving side        |
| `Closure`                                               | The function body is transferred along with all `use(...)` vars |
| `WeakReference`                                         | Transferred together with the referent (see below)              |
| `WeakMap`                                               | Transferred with all keys and values (see below)                |
| `Async\FutureState`                                     | Once only, to write a result from the thread (see below)        |

### What cannot be transferred

| Type                                                   | Why                                                                              |
|--------------------------------------------------------|----------------------------------------------------------------------------------|
| `stdClass` and any objects with dynamic properties     | Dynamic properties have no class-level declaration and cannot be correctly recreated in the receiving thread |
| PHP references (`&$var`)                               | A shared reference between threads contradicts the model                         |
| Resources (`resource`)                                 | File descriptors, curl handles, sockets are bound to a specific thread           |

Attempting to transfer any of these will immediately throw `Async\ThreadTransferException` in the source:

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

### Object identity is preserved

The same object referenced multiple times in a data graph is **created only once in the receiving
thread**, and all references point to it. Within a single transfer operation (all variables from
`use(...)` of one closure, one channel send, one thread result) identity is preserved:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// The class must be declared in the receiving thread's environment — we do this via a bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // The same instance in two different variables
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // A mutation via one reference is visible through the other
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

The same applies to linked objects within a single graph: an array with references to shared nested
objects will preserve identity after transfer.

### Cycles

A graph with a cycle through regular objects can be transferred. The limitation is that very deeply
nested cycles may hit the internal transfer depth limit (hundreds of levels). In practice, this
almost never occurs. Cycles of the form `$node->weakParent = WeakReference::create($node)` — that
is, an object that references itself via a `WeakReference` — currently run into the same limit, so
it is better not to use them within a single transferred graph.

## WeakReference across threads

`WeakReference` has special transfer logic. The behavior depends on what else is transferred alongside it.

### Referent is also transferred — identity is preserved

If the object itself is transferred together with the `WeakReference` (directly, inside an array,
or as a property of another object), then on the receiving side `$wr->get()` returns **exactly
that** instance that ended up in the other references:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### Referent is not transferred — WeakReference becomes dead

If only the `WeakReference` is transferred but not the object itself, then in the receiving thread
no one holds a strong reference to that object. By PHP's rules this means the object is immediately
destroyed and the `WeakReference` becomes **dead** (`$wr->get() === null`). This is exactly the same
behavior as in single-threaded PHP: without a strong owner, the object is collected.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj is NOT transferred
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### Source is already dead

If the `WeakReference` was already dead in the source at the time of transfer (`$wr->get() === null`),
it will arrive in the receiving thread dead as well.

### Singleton

`WeakReference::create($obj)` returns a singleton: two calls for the same object yield **the same**
`WeakReference` instance. This property is preserved during transfer — in the receiving thread there
will also be exactly one `WeakReference` instance per object.

## WeakMap across threads

`WeakMap` is transferred with all its entries. But the same rule applies as in single-threaded PHP:
**a `WeakMap` key lives only as long as someone holds a strong reference to it**.

### Keys are in the graph — entries survive

If the keys are transferred separately (or are reachable through other transferred objects), the
`WeakMap` in the receiving thread contains all entries:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Only WeakMap — entries disappear

If only the `WeakMap` is transferred and its keys do not appear anywhere else in the graph, the
`WeakMap` **will be empty in the receiving thread**. This is not a bug; it is a direct consequence
of weak semantics: without a strong owner, the key is destroyed immediately after being loaded and
the corresponding entry disappears.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost is not transferred
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

For an entry to "survive" the transfer, its key must be transferred separately (or as part of some
other object that is itself included in the graph).

### Nested structures

A `WeakMap` may contain other `WeakMap`s, `WeakReference`s, arrays, and regular objects as values —
everything is transferred recursively. Cycles of the form `$wm[$obj] = $wm` are handled correctly.

## Future across threads

Directly transferring an `Async\Future` between threads is **not possible**: a `Future` is a waiter
object whose events are bound to the scheduler of the thread in which it was created. Instead, you
can transfer the "writer" side — `Async\FutureState` — and only **once**.

The typical pattern: the parent creates a `FutureState` + `Future` pair, passes `FutureState` itself
into the thread via a `use(...)` variable, the thread calls `complete()` or `error()`, and the
parent receives the result through its `Future`:

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
        // Simulating heavy work
        $data = "computed in thread";
        $state->complete($data);
    });

    // The parent waits through its own Future — the event arrives here
    // when the thread calls $state->complete()
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

**Important constraints:**

1. `FutureState` can be transferred to **only one** thread. A second transfer attempt will throw an exception.
2. Transferring the `Future` itself is not allowed — it belongs to the parent thread and can only
   wake its own owner.
3. After `FutureState` is transferred, the original object in the parent remains valid: when the
   thread calls `complete()`, that change becomes visible through the `Future` in the parent —
   `await($future)` unblocks.

This is the only standard way to deliver a **single result** from a thread back to the caller,
outside of the ordinary `return` from `spawn_thread()`. If you need to stream many values, use
`ThreadChannel`.

## Bootloader: preparing the thread environment

A thread has **its own environment** and does not inherit class, function, or constant definitions
declared in the parent script. If a closure uses a user-defined class, that class must either be
re-declared or loaded through autoload — for this there is the `bootloader` parameter:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config must exist in the thread
        return $config->name;
    },
    bootloader: function() {
        // Executed in the receiving thread BEFORE the main closure
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

The bootloader is guaranteed to run in the receiving thread before the `use(...)` variables are
loaded and before the main closure is called. Typical bootloader tasks: registering autoload,
declaring classes via `eval`, setting ini options, loading libraries.

## Edge cases

### Superglobals

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` are their own in the thread — they are initialized fresh,
as in a new request. In the current version of TrueAsync, populating them in receiving threads is
temporarily disabled (planned to be enabled later) — watch the CHANGELOG.

### Static function variables

Each thread has its own set of static function and class variables. Changes in one thread are not
visible to others — this is part of the general isolation.

### Opcache

Opcache shares its compiled bytecode cache between threads as read-only: scripts are compiled once
for the entire process, and each new thread reuses the ready bytecode. This makes thread startup
faster.

## See also

- [`spawn_thread()`](/en/docs/reference/spawn-thread.html) — running a closure in a thread
- [`Async\ThreadChannel`](/en/docs/components/thread-channels.html) — channels between threads
- [`await()`](/en/docs/reference/await.html) — waiting for a thread result
- [`Async\RemoteException`](/en/docs/components/exceptions.html) — wrapper for receiving-thread errors
