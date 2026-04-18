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
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Creates a new thread pool and starts all worker threads immediately. Workers remain alive for the lifetime of the pool, eliminating per-task thread-startup overhead.

## Parameters

| Parameter    | Type  | Description                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Number of worker threads to create. Must be ≥ 1. All threads start at construction time.                |
| `$queueSize` | `int` | Maximum number of tasks that can wait in the queue. `0` (default) means `$workers × 4`. When the queue is full, `submit()` suspends the calling coroutine until a slot becomes available. |

## Exceptions

Throws `\ValueError` if `$workers < 1`.

## Examples

### Example #1 Basic pool creation

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 workers, queue size defaults to 16
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

## See Also

- [ThreadPool::submit()](/en/docs/reference/thread-pool/submit.html) — add a task to the pool
- [ThreadPool::close()](/en/docs/reference/thread-pool/close.html) — graceful shutdown
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
- [`spawn_thread()`](/en/docs/reference/spawn-thread.html) — one-off thread for a single task
