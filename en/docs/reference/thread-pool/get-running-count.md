---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Get the number of tasks currently executing in worker threads."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Returns the number of tasks that are currently being executed by a worker thread (i.e. picked up from the queue and not yet finished). The maximum value is bounded by the number of workers. This counter is backed by an atomic variable and is accurate at any point in time.

## Return Value

`int` — number of tasks currently executing across all worker threads.

## Examples

### Example #1 Watching running count while tasks execute

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

    delay(10); // give workers time to start

    echo "workers: ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "running: ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "running: ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## See Also

- [ThreadPool::getPendingCount()](/en/docs/reference/thread-pool/get-pending-count.html) — tasks waiting in the queue
- [ThreadPool::getCompletedCount()](/en/docs/reference/thread-pool/get-completed-count.html) — total completed tasks
- [ThreadPool::getWorkerCount()](/en/docs/reference/thread-pool/get-worker-count.html) — number of workers
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
