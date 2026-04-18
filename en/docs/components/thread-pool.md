---
layout: docs
lang: en
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /en/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — a pool of worker threads for parallel CPU-bound task execution in TrueAsync."
---

# Async\ThreadPool: worker thread pool

## Why ThreadPool

[`spawn_thread()`](/en/docs/reference/spawn-thread.html) solves the "one task — one thread" problem:
launch a heavy computation, wait for the result, thread exits. This is convenient, but comes at a
cost: **every thread launch is a full system call**. Initializing a separate PHP environment,
loading Opcache bytecode, allocating a stack — all of this happens from scratch. With hundreds or
thousands of such tasks, the overhead becomes noticeable.

`Async\ThreadPool` solves this problem: at startup, a fixed set of **worker threads**
(OS threads with their own PHP environment) is created, living for the entire lifetime of the program
and **reused repeatedly** to execute tasks. Each `submit()` places a task into the queue, a free
worker picks it up, executes it, and returns the result via [`Async\Future`](/en/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Submit 8 tasks to a pool of 4 workers
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

Eight tasks run in parallel across four workers. While the workers compute — the main program
(other coroutines) continues running: `await($f)` suspends only the waiting coroutine, not
the entire process.

## When to use ThreadPool vs spawn_thread or coroutines

| Scenario                                                 | Tool                     |
|----------------------------------------------------------|--------------------------|
| One heavy task, launched rarely                          | `spawn_thread()`         |
| Many short CPU tasks in a loop                           | `ThreadPool`             |
| A fixed thread that lives for the entire program         | `ThreadPool`             |
| I/O: network, database, filesystem                       | Coroutines               |
| Task needed immediately, without a queue                 | `spawn_thread()`         |

**Key rule:** if tasks are many and short — a pool amortizes the thread startup cost.
If there is one task launched once every few seconds — `spawn_thread()` is sufficient.

A typical pool size equals the number of physical CPU cores (`nproc` on Linux, `sysconf(_SC_NPROCESSORS_ONLN)`
in C). More workers than cores does not speed up CPU-bound workloads and only adds context-switching overhead.

## Creating a pool

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Parameter    | Type  | Purpose                                                              | Default           |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Number of worker threads. All start when the pool is created         | **required**      |
| `$queueSize` | `int` | Maximum length of the pending task queue                             | `workers × 4`     |

All worker threads start **immediately upon creation** of the pool — `new ThreadPool(4)` creates four
threads right away. This is a small "upfront" investment, but subsequent `submit()` calls carry no
thread-startup overhead.

`$queueSize` limits the size of the internal task queue. If the queue is full (all workers are busy
and there are already `$queueSize` tasks in the queue), the next `submit()` **suspends the calling
coroutine** until a worker becomes available. A value of zero means `workers × 4`.

## Submitting tasks

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Adds a task to the pool's queue. Returns an [`Async\Future`](/en/docs/components/future.html)
that:

- **resolves** with the `return` value of `$task` when the worker finishes execution;
- **rejects** with an exception if `$task` threw an exception.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Task without arguments
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Task with arguments — arguments are also passed by value (deep copy)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### Handling exceptions from a task

If a task throws an exception, the `Future` is rejected, and `await()` rethrows it in the
calling coroutine:

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### Data transfer rules

The task (`$task`) and all `...$args` are **deep-copied** into the worker thread — the same rules
as with `spawn_thread()`. You cannot pass `stdClass`, PHP references (`&$var`), or resources; attempting
to do so will cause the source to throw `Async\ThreadTransferException`. More details:
[«Data transfer between threads»](/en/docs/components/threads.html#data-transfer-between-threads).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Applies `$task` to each element of `$items` in parallel using the pool's workers. **Blocks** the
calling coroutine until all tasks complete. Returns an array of results in the same order as the
input data.

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

If at least one task throws an exception, `map()` rethrows it in the calling coroutine.
The result order always matches the input element order, regardless of the order in which
workers finish.

## Monitoring pool state

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Launch several tasks
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Simulate work
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Check counters while tasks are running
    delay(50); // give workers time to start
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| Method                | What it returns                                                                         |
|-----------------------|-----------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Number of worker threads (set in the constructor)                                       |
| `getPendingCount()`   | Tasks in the queue, not yet picked up by a worker                                       |
| `getRunningCount()`   | Tasks currently being executed by a worker                                              |
| `getCompletedCount()` | Total tasks completed since the pool was created (monotonically increasing)             |
| `isClosed()`          | `true` if the pool has been closed via `close()` or `cancel()`                          |

The counters are implemented as atomic variables — they are accurate at any point in time, even
when workers are running in parallel threads.

## Shutting down the pool

Worker threads live until the pool is explicitly stopped. Always call `close()`
or `cancel()` when done — otherwise threads will continue running until the end of the process.

### close() — graceful shutdown

```php
$pool->close();
```

After calling `close()`:

- New `submit()` calls immediately throw `Async\ThreadPoolException`.
- Tasks already in the queue or being executed by workers **complete normally**.
- The method returns only after all in-progress tasks have finished and all workers have stopped.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // Guaranteed to get the result

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — hard/forced shutdown

```php
$pool->cancel();
```

After calling `cancel()`:

- New `submit()` calls throw `Async\ThreadPoolException`.
- Tasks in the queue (not yet picked up by a worker) are **immediately rejected** — the corresponding
  `Future` objects transition to the "rejected" state.
- Tasks already being executed by workers **run to completion** of the current iteration (forcibly
  interrupting PHP code inside a thread is not possible).
- Workers stop immediately after finishing the current task and do not pick up new ones.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Fill the queue with tasks
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Cancel immediately — tasks in the queue will be rejected
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

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### Comparing close() and cancel()

| Aspect                          | `close()`                          | `cancel()`                            |
|---------------------------------|------------------------------------|---------------------------------------|
| New submit() calls              | Throws `ThreadPoolException`       | Throws `ThreadPoolException`          |
| Tasks in the queue              | Execute normally                   | Rejected immediately                  |
| Currently executing tasks       | Complete normally                  | Complete normally (current iteration) |
| When workers stop               | After the queue is drained         | After the current task completes      |

## Passing a pool between threads

The `ThreadPool` object is itself thread-safe: it can be passed into `spawn_thread()` via `use()`,
and any thread can call `submit()` on the same pool.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Create the pool once in the main thread
    $pool = new ThreadPool(workers: 4);

    // Launch an OS thread that will also use the pool
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

This enables architectures where multiple OS threads or coroutines **share a single pool**,
submitting tasks to it independently of each other.

## Full example: parallel image processing

The pool is created once. Each worker receives a file path, opens the image via GD,
scales it down to the specified dimensions, converts it to grayscale, and saves it to the output directory.
The main thread collects results as they become ready.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// This function is executed in a worker thread.
// GD operations are CPU-bound — exactly the kind of tasks that benefit from threads.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Open source
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Resize while preserving aspect ratio
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Convert to grayscale
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Save to output directory
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // List of files to process
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() preserves order — results[i] corresponds to files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## See also

- [`spawn_thread()`](/en/docs/reference/spawn-thread.html) — launching a single task in a separate thread
- [`Async\Thread`](/en/docs/components/threads.html) — OS threads and data transfer rules
- [`Async\ThreadChannel`](/en/docs/components/thread-channels.html) — thread-safe channels
- [`Async\Future`](/en/docs/components/future.html) — waiting for a task result
