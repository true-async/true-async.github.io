---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Get the number of tasks waiting in the thread pool queue."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Returns the number of tasks that have been submitted but not yet picked up by a worker thread. This counter is backed by an atomic variable and is accurate at any point in time, even while workers are running in parallel.

## Return Value

`int` — number of tasks currently waiting in the queue.

## Examples

### Example #1 Observing the queue drain

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // let workers start

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## See Also

- [ThreadPool::getRunningCount()](/en/docs/reference/thread-pool/get-running-count.html) — tasks currently executing
- [ThreadPool::getCompletedCount()](/en/docs/reference/thread-pool/get-completed-count.html) — total completed tasks
- [ThreadPool::getWorkerCount()](/en/docs/reference/thread-pool/get-worker-count.html) — number of workers
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
