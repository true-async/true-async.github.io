---
layout: docs
lang: en
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /en/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — a thread-safe channel for passing data between OS threads in TrueAsync."
---

# Async\ThreadChannel: channels between OS threads

## How it differs from a regular Channel

`Async\Channel` works **within a single thread** — between coroutines of the same scheduler. Its data lives in **thread-local memory**, and safety is guaranteed by the fact that only one coroutine accesses the channel at a time.

`Async\ThreadChannel` is designed for passing data **between OS threads**. The channel buffer lives in **shared memory** accessible to all threads, not in the memory of any single thread. Each sent value is deep-copied into that shared memory, and on the receiver side — back into the thread's local memory. Synchronization is via a thread-safe mutex, so `send()` and `recv()` can be called from different OS threads concurrently.

| Property                          | `Async\Channel`                        | `Async\ThreadChannel`                        |
|-----------------------------------|----------------------------------------|----------------------------------------------|
| Scope                             | Single OS thread                       | Between OS threads                           |
| Where buffered data lives         | Thread-local memory                    | Shared memory visible to all threads         |
| Synchronization                   | Coroutine scheduler (cooperative)      | Mutex (thread-safe)                          |
| Rendezvous (capacity=0)           | Supported                              | No — always buffered                         |
| Minimum capacity                  | 0                                      | 1                                            |

If everything runs in a single thread — use `Async\Channel`, it's lighter. `ThreadChannel` makes sense only when you genuinely need data exchange between OS threads.

## Creating a channel

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — buffer size (minimum `1`). Larger values better absorb bursty producers, but consume more memory for the live queue.

## Basic example: producer + consumer

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Producer — a separate OS thread
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Consumer — in the main thread (a coroutine)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "got: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "channel closed\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

The producer writes to the channel from a separate thread; the main thread reads via `recv()` — nothing special, it looks just like a regular `Channel`.

## send / recv

### `send($value[, $cancellation])`

Sends a value into the channel. If the buffer is full — **suspends the current coroutine** (cooperative suspension — other coroutines in this scheduler keep running) until another thread frees space.

The value is **deep-copied into the channel's shared memory** following the same rules as variables captured via `use(...)` in `spawn_thread()`. Objects with dynamic properties, PHP references, and resources are rejected with `Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // array
$ch->send(new Point(3, 4));                    // object with declared props
$ch->send($futureState);                       // Async\FutureState (once!)
```

If the channel is already closed — `send()` throws `Async\ThreadChannelException`.

### `recv([$cancellation])`

Reads a value from the channel. If the buffer is empty — suspends the current coroutine until data arrives **or** the channel is closed.

- If data arrives — returns the value.
- If the channel is closed and the buffer is empty — throws `Async\ThreadChannelException`.
- If the channel is closed but the buffer still has items — **drains the remaining data first**, only throwing `ThreadChannelException` once the buffer is empty.

This allows correctly draining a channel after it is closed.

## Channel state

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| Method         | Returns                                       |
|----------------|-----------------------------------------------|
| `capacity()`   | Buffer size set in the constructor            |
| `count()`      | Current number of messages in the buffer      |
| `isEmpty()`    | `true` if the buffer is empty                 |
| `isFull()`     | `true` if the buffer is filled to capacity    |
| `isClosed()`   | `true` if the channel has been closed         |

`ThreadChannel` implements `Countable`, so `count($ch)` works.

## close()

```php
$ch->close();
```

After closing:

- `send()` immediately throws `Async\ThreadChannelException`.
- `recv()` **drains remaining values**, then starts throwing `ThreadChannelException`.
- All coroutines/threads suspended in `send()` or `recv()` are **woken** with `ThreadChannelException`.

A channel can only be closed once. A repeated call is a safe no-op.

## Pattern: worker pool

Two channels — one for jobs, one for results. Worker threads read jobs from the first and put results into the second.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 worker threads
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Simulate CPU load
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // jobs channel closed — worker exits
            }
        });
    }

    // Dispatch 6 jobs
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Wait for all worker threads to finish
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Drain results
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Each worker handled 2 jobs — the load was distributed across three threads.

### Note on distribution

If the producer writes to the channel faster than the workers read (or if the workers spend almost no CPU time), **the first worker may grab all jobs** immediately, because its `recv()` wakes up first and picks up the next message before the other workers reach their `recv()`. This is normal behavior for a concurrent queue — fair scheduling is not guaranteed.

If strict uniformity is required — partition tasks upfront (shard-by-hash), or give each worker its own dedicated channel.

## Passing complex data through the channel

`ThreadChannel` can carry anything that cross-thread data transfer supports (see [Passing data between threads](/en/docs/components/threads.html#passing-data-between-threads)):

- scalars, arrays, objects with declared properties
- `Closure` (closures)
- `WeakReference` and `WeakMap` (with the same strong-owner rules as in `spawn_thread`)
- `Async\FutureState` (once)

Each `send()` call is an independent operation with its own identity table. **Identity is preserved within a single message**, but not across separate `send()` calls. If you want two receivers to see "the same" object — send it once inside an array, not as two separate messages.

## Limitations

- **Minimum capacity is 1.** Rendezvous (capacity=0) is not supported, unlike `Async\Channel`.
- **`ThreadChannel` does not support serialization.** Channel objects cannot be saved to a file or sent over the network — a channel exists only within a live process.
- **A channel handle can be passed** via `spawn_thread` or nested inside another channel — the object handle for `ThreadChannel` transfers correctly, and both sides see the same internal buffer.

## See also

- [`Async\Thread`](/en/docs/components/threads.html) — OS threads in TrueAsync
- [`spawn_thread()`](/en/docs/reference/spawn-thread.html) — start a closure in a new thread
- [`Async\Channel`](/en/docs/components/channels.html) — channels between coroutines in the same thread
