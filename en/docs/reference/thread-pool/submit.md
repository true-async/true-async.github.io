---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Submit a task to the thread pool and receive a Future for its result."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Adds a task to the pool's internal queue. A free worker picks it up, executes it, and resolves the returned `Future` with the return value. If the queue is full, the calling coroutine is suspended until a slot opens.

## Parameters

| Parameter | Type       | Description                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | The callable to execute in a worker thread. Deep-copied into the worker — closures capturing objects or resources will throw `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Additional arguments passed to `$task`. Also deep-copied.                                                           |

## Return Value

`Async\Future` — resolves with the return value of `$task`, or rejects with any exception thrown by `$task`.

## Exceptions

- `Async\ThreadPoolException` — thrown immediately if the pool has been closed via `close()` or `cancel()`.
- `Async\ThreadTransferException` — thrown if `$task` or any argument cannot be serialized for transfer (e.g. `stdClass`, PHP references, resources).

## Examples

### Example #1 Basic submit and await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### Example #2 Handling exceptions from a task

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### Example #3 Submitting multiple tasks in parallel

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## See Also

- [ThreadPool::map()](/en/docs/reference/thread-pool/map.html) — parallel map over an array
- [ThreadPool::close()](/en/docs/reference/thread-pool/close.html) — graceful shutdown
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview and data transfer rules
