---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Get the number of worker threads in the thread pool."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Returns the number of worker threads in the pool. This value is fixed at construction time and does not change during the pool's lifetime. It equals the `$workers` argument passed to [`new ThreadPool()`](/en/docs/reference/thread-pool/__construct.html).

## Return Value

`int` — number of worker threads (as set in the constructor).

## Examples

### Example #1 Confirming worker count

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    echo $pool->getWorkerCount(), "\n"; // 4

    $pool->close();
});
```

### Example #2 Sizing the pool to available CPU cores

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool created with ", $pool->getWorkerCount(), " workers\n";

    $futures = [];
    for ($i = 0; $i < $cores * 2; $i++) {
        $futures[] = $pool->submit(fn() => 'done');
    }
    foreach ($futures as $f) {
        await($f);
    }

    $pool->close();
});
```

## See Also

- [ThreadPool::getPendingCount()](/en/docs/reference/thread-pool/get-pending-count.html) — tasks waiting in the queue
- [ThreadPool::getRunningCount()](/en/docs/reference/thread-pool/get-running-count.html) — tasks currently executing
- [ThreadPool::getCompletedCount()](/en/docs/reference/thread-pool/get-completed-count.html) — total completed tasks
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
