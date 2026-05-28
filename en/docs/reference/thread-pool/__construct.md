---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Create a new ThreadPool with a fixed number of worker threads."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

Creates a new thread pool and starts all worker threads immediately. Workers remain alive for the
lifetime of the pool, eliminating per-task thread-startup overhead.

## Parameters

| Parameter      | Type          | Description                                                                                                                              |
|----------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`         | Number of worker threads. `0` (default) — autodetect via [`Async\available_parallelism()`](/en/docs/reference/available-parallelism.html). |
| `$queueSize`   | `int`         | Maximum length of the pending task queue. `0` (default) means `workers × 4`. When the queue is full, `submit()` suspends the calling coroutine until a slot becomes available. |
| `$bootloader`  | `?\Closure`   | Worker startup initialisation. The closure is deep-copied once and runs in every worker **before** the main task loop. Useful for autoload, connection-pool warmup, opcache pre-compile. If the bootloader throws, the entire pool is considered failed. |
| `$coroutine`   | `bool`        | When `true`, every task runs **as a coroutine** in its own child scope nested inside the worker's shared pool scope. Inside the task you can `await`, use channels, do I/O, and `spawn` — all without blocking the OS thread. |
| `$concurrency` | `int`         | Concurrency limit of coroutines inside a single worker. Used only when `coroutine: true`. `0` (default) — unlimited. |

## Exceptions

Throws `\ValueError` if `$workers < 0` or `$queueSize < 0`.

## Examples

### Example #1 Basic pool creation

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 worker threads, default queue size — 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Example #2 Explicit queue size

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 workers, queue capped at 64 pending tasks
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... submit tasks ...

    $pool->close();
});
```

### Example #3 Bootloader — worker startup initialisation

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... submitted tasks see a fully initialised environment ...

    $pool->close();
});
```

### Example #4 Coroutine mode — `await` inside a task

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // a regular blocking call correctly parks the coroutine
        // rather than blocking the worker's OS thread
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Example #5 Autodetect worker count from available CPUs

```php
<?php

use Async\ThreadPool;

// workers: 0 (default) → Async\available_parallelism()
$pool = new ThreadPool();   // honours the container's cgroup quota / affinity
```

## See Also

- [ThreadPool::submit()](/en/docs/reference/thread-pool/submit.html) — add a task to the pool
- [ThreadPool::close()](/en/docs/reference/thread-pool/close.html) — graceful shutdown
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
- [`spawn_thread()`](/en/docs/reference/spawn-thread.html) — one-off thread for a single task
