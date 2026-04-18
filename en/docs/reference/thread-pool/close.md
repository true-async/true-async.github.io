---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Gracefully shut down the thread pool, waiting for all queued and running tasks to finish."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Initiates a graceful shutdown of the pool. After `close()` is called:

- Any subsequent `submit()` call immediately throws `Async\ThreadPoolException`.
- Tasks already in the queue continue and complete normally.
- Tasks currently executing in worker threads complete normally.
- The method blocks the calling coroutine until all in-progress tasks have finished and all workers have stopped.

For an immediate, hard shutdown that discards queued tasks, use [`cancel()`](/en/docs/reference/thread-pool/cancel.html) instead.

## Return Value

`void`

## Examples

### Example #1 Graceful shutdown after all tasks are submitted

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // waits for the task above to complete

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Example #2 Submit after close throws an exception

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## See Also

- [ThreadPool::cancel()](/en/docs/reference/thread-pool/cancel.html) — hard/forced shutdown
- [ThreadPool::isClosed()](/en/docs/reference/thread-pool/is-closed.html) — check if pool is closed
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
