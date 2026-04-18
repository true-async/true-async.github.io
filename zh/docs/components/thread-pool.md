---
layout: docs
lang: zh
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /zh/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — TrueAsync 中用于并行执行 CPU 密集型任务的工作线程池。"
---

# Async\ThreadPool：工作线程池

## 为什么需要 ThreadPool

[`spawn_thread()`](/zh/docs/reference/spawn-thread.html) 解决了"一个任务——一个线程"的问题：
启动一个繁重的计算，等待结果，线程退出。这很方便，但有代价：**每次线程启动都是一次完整的系统调用**。
初始化独立的 PHP 环境、加载 Opcache 字节码、分配栈——所有这些都从头开始。当有数百或
数千个这样的任务时，开销就会变得显著。

`Async\ThreadPool` 解决了这个问题：在启动时创建一组固定的**工作线程**
（拥有自己 PHP 环境的 OS 线程），这些线程在程序的整个生命周期内存活，
并被**反复重用**来执行任务。每次 `submit()` 将任务放入队列，空闲的工作线程
拾取它、执行它，并通过 [`Async\Future`](/zh/docs/components/future.html) 返回结果。

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // 向有 4 个工作线程的池提交 8 个任务
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

八个任务在四个工作线程中并行运行。当工作线程计算时——主程序
（其他协程）继续运行：`await($f)` 只暂停等待的协程，而不是
整个进程。

## 何时使用 ThreadPool、spawn_thread 或协程

| 场景                                                     | 工具                     |
|----------------------------------------------------------|--------------------------|
| 一个繁重任务，很少启动                                   | `spawn_thread()`         |
| 循环中的许多短 CPU 任务                                  | `ThreadPool`             |
| 在整个程序生命周期中存活的固定线程                       | `ThreadPool`             |
| I/O：网络、数据库、文件系统                              | 协程                     |
| 需要立即执行的任务，无需队列                             | `spawn_thread()`         |

**核心规则：** 如果任务多且短——池可以摊销线程启动成本。
如果每隔几秒才启动一个任务——`spawn_thread()` 就足够了。

典型的池大小等于物理 CPU 核心数（Linux 上的 `nproc`，
C 中的 `sysconf(_SC_NPROCESSORS_ONLN)`）。工作线程数超过核心数
不会加速 CPU 密集型工作负载，只会增加上下文切换开销。

## 创建池

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| 参数         | 类型  | 用途                                                                 | 默认值            |
|--------------|-------|----------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | 工作线程数。创建池时全部启动                                         | **必填**          |
| `$queueSize` | `int` | 待处理任务队列的最大长度                                             | `workers × 4`     |

所有工作线程在**创建池时立即启动**——`new ThreadPool(4)` 会立即创建四个线程。
这是一笔小的"前期"投资，但后续的 `submit()` 调用不会有线程启动开销。

`$queueSize` 限制内部任务队列的大小。如果队列已满（所有工作线程都在忙，
且队列中已有 `$queueSize` 个任务），下一次 `submit()` 将**暂停调用协程**，
直到工作线程变为可用。值为零意味着 `workers × 4`。

## 提交任务

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

将任务添加到池的队列。返回一个 [`Async\Future`](/zh/docs/components/future.html)，它：

- 当工作线程完成执行时，以 `$task` 的 `return` 值**解析**；
- 如果 `$task` 抛出异常，则以异常**拒绝**。

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // 无参数任务
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // 带参数的任务——参数也按值传递（深度拷贝）
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

#### 处理任务异常

如果任务抛出异常，`Future` 被拒绝，`await()` 在调用协程中重新抛出它：

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

#### 数据传输规则

任务（`$task`）和所有 `...$args` 都被**深度拷贝**到工作线程中——规则与
`spawn_thread()` 相同。你不能传递 `stdClass`、PHP 引用（`&$var`）或资源；
尝试这样做将导致源端抛出 `Async\ThreadTransferException`。更多详情：
[《线程间的数据传输》](/zh/docs/components/threads.html#线程间的数据传输)。

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

使用池的工作线程并行地将 `$task` 应用于 `$items` 的每个元素。**阻塞**
调用协程直到所有任务完成。返回一个与输入数据顺序相同的结果数组。

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

如果至少有一个任务抛出异常，`map()` 在调用协程中重新抛出它。
结果顺序始终与输入元素顺序匹配，无论工作线程完成的顺序如何。

## 监控池状态

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // 启动几个任务
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // 模拟工作
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // 在任务运行时检查计数器
    delay(50); // 给工作线程时间启动
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

| 方法                  | 返回内容                                                                                |
|-----------------------|-----------------------------------------------------------------------------------------|
| `getWorkerCount()`    | 工作线程数（在构造函数中设置）                                                          |
| `getPendingCount()`   | 队列中尚未被工作线程拾取的任务                                                          |
| `getRunningCount()`   | 当前正在被工作线程执行的任务                                                            |
| `getCompletedCount()` | 自池创建以来完成的任务总数（单调递增）                                                  |
| `isClosed()`          | 如果池已通过 `close()` 或 `cancel()` 关闭，则为 `true`                                 |

计数器以原子变量实现——即使工作线程在并行线程中运行，它们在任何时间点都是准确的。

## 关闭池

工作线程将一直存活，直到池被明确停止。完成后始终调用 `close()`
或 `cancel()`——否则线程将继续运行直到进程结束。

### close() — 优雅关闭

```php
$pool->close();
```

调用 `close()` 后：

- 新的 `submit()` 调用立即抛出 `Async\ThreadPoolException`。
- 已在队列中或正在被工作线程执行的任务**正常完成**。
- 该方法仅在所有正在进行的任务完成且所有工作线程停止后才返回。

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

    echo await($f), "\n"; // 保证能获得结果

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

### cancel() — 强制关闭

```php
$pool->cancel();
```

调用 `cancel()` 后：

- 新的 `submit()` 调用抛出 `Async\ThreadPoolException`。
- 队列中（尚未被工作线程拾取）的任务被**立即拒绝**——相应的
  `Future` 对象转换为"已拒绝"状态。
- 已被工作线程执行的任务**运行到当前迭代完成**（强制中断线程内的
  PHP 代码是不可能的）。
- 工作线程在完成当前任务后立即停止，不再拾取新任务。

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // 用任务填充队列
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // 立即取消——队列中的任务将被拒绝
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

### 比较 close() 和 cancel()

| 方面                            | `close()`                          | `cancel()`                            |
|---------------------------------|------------------------------------|---------------------------------------|
| 新的 submit() 调用              | 抛出 `ThreadPoolException`         | 抛出 `ThreadPoolException`            |
| 队列中的任务                    | 正常执行                           | 立即拒绝                              |
| 当前正在执行的任务              | 正常完成                           | 正常完成（当前迭代）                  |
| 工作线程何时停止                | 队列清空后                         | 当前任务完成后                        |

## 在线程间传递池

`ThreadPool` 对象本身是线程安全的：它可以通过 `use()` 传入 `spawn_thread()`，
任何线程都可以对同一个池调用 `submit()`。

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // 在主线程中创建一次池
    $pool = new ThreadPool(workers: 4);

    // 启动一个也会使用该池的 OS 线程
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

这使得多个 OS 线程或协程**共享单个池**的架构成为可能，
相互独立地向其提交任务。

## 完整示例：并行图像处理

池只创建一次。每个工作线程接收一个文件路径，通过 GD 打开图像，
将其缩小到指定尺寸，转换为灰度，并保存到输出目录。
主线程在结果就绪时收集它们。

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// 此函数在工作线程中执行。
// GD 操作是 CPU 密集型的——正是适合使用线程的任务类型。
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // 打开源文件
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // 在保持宽高比的同时调整大小
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // 转换为灰度
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // 保存到输出目录
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

    // 要处理的文件列表
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() 保留顺序——results[i] 对应 files[i]
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

## 另请参阅

- [`spawn_thread()`](/zh/docs/reference/spawn-thread.html) — 在独立线程中启动单个任务
- [`Async\Thread`](/zh/docs/components/threads.html) — OS 线程与数据传输规则
- [`Async\ThreadChannel`](/zh/docs/components/thread-channels.html) — 线程安全的通道
- [`Async\Future`](/zh/docs/components/future.html) — 等待任务结果
