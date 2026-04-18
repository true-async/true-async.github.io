---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Get the total number of tasks completed by the thread pool since creation."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Returns the total number of tasks that have been executed to completion (successfully or with an exception) by any worker in this pool since the pool was created. This counter is monotonically increasing and never resets. It is backed by an atomic variable and is accurate at any point in time.

A task is counted as completed when the worker finishes executing it — regardless of whether it returned a value or threw an exception.

## Return Value

`int` — total completed task count since pool creation.

## Examples

### Example #1 Tracking throughput

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10);
    echo "completed so far: ", $pool->getCompletedCount(), "\n"; // 0 or more

    foreach ($futures as $f) {
        await($f);
    }

    echo "completed total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## See Also

- [ThreadPool::getPendingCount()](/en/docs/reference/thread-pool/get-pending-count.html) — tasks waiting in the queue
- [ThreadPool::getRunningCount()](/en/docs/reference/thread-pool/get-running-count.html) — tasks currently executing
- [ThreadPool::getWorkerCount()](/en/docs/reference/thread-pool/get-worker-count.html) — number of workers
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
