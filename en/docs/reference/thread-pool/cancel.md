---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Hard-stop the thread pool, immediately rejecting all queued tasks."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Initiates a forced shutdown of the pool. After `cancel()` is called:

- Any subsequent `submit()` call immediately throws `Async\ThreadPoolException`.
- Tasks waiting in the queue (not yet picked up by a worker) are **immediately rejected** — their corresponding `Future` objects transition to the rejected state with a `ThreadPoolException` (or with a `CancellationException` in `coroutine: true` mode).
- In **normal mode** (`coroutine: false`) tasks already executing in worker threads run to completion of the current task — forcibly interrupting PHP code inside an OS thread is not possible.
- In **`coroutine: true` mode**, in-flight tasks are **actually cancelled** (since TrueAsync 0.7.0): the atomic `cancel_requested` flag is set before the channel is closed, the worker calls `ZEND_ASYNC_SCOPE_CANCEL(pool_scope, NULL, false, false)`, and `AFTER_MAIN` cascades cancellation to all child scopes of running tasks.
- Workers stop as soon as they finish the current task and do not pick up any new tasks from the queue.

For a graceful shutdown that lets all queued tasks finish, use [`close()`](/en/docs/reference/thread-pool/close.html) instead.

## Return Value

`void`

## Examples

### Example #1 Hard cancel with queued tasks

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Fill the queue with 8 tasks across 2 workers
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Cancel immediately — tasks in the queue are rejected
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (already running when cancel() was called)
    echo "cancelled: $cancelled\n"; // 6  (were still in the queue)
});
```

## See Also

- [ThreadPool::close()](/en/docs/reference/thread-pool/close.html) — graceful shutdown
- [ThreadPool::isClosed()](/en/docs/reference/thread-pool/is-closed.html) — check if pool is closed
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview and close() vs cancel() comparison
