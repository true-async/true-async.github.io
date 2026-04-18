---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Apply a callable to each array item in parallel using the thread pool."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Submits `$task($item)` for every element of `$items` to the pool's workers concurrently, then blocks the calling coroutine until all tasks finish. Returns results in the same order as the input array, regardless of the order in which workers complete.

If any task throws an exception, `map()` rethrows it in the calling coroutine. Other in-flight tasks are not cancelled.

## Parameters

| Parameter | Type       | Description                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | The input items. Each element is passed as the first argument to `$task`.                                |
| `$task`   | `callable` | The callable to apply to each item. Executed in a worker thread; the same data-transfer rules as `submit()` apply. |

## Return Value

`array` — results of `$task` for each input element, in the same order as `$items`.

## Exceptions

- `Async\ThreadPoolException` — if the pool has been closed.
- Re-throws the first exception thrown by any task.

## Examples

### Example #1 Count lines in multiple files in parallel

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

### Example #2 Parallel number crunching

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $inputs = [1_000_000, 2_000_000, 3_000_000, 4_000_000];

    $results = $pool->map($inputs, function(int $n) {
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    foreach ($inputs as $i => $n) {
        echo "$n iterations → {$results[$i]}\n";
    }

    $pool->close();
});
```

## See Also

- [ThreadPool::submit()](/en/docs/reference/thread-pool/submit.html) — submit a single task and get a Future
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
