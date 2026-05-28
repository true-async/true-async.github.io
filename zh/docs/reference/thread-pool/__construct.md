---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "创建一个新的 ThreadPool，可选 bootloader、协程模式和自动检测的 worker 数。"
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

创建一个新的线程池，并立即启动所有 worker 线程。线程在整个池的生命周期内保持活跃，
省掉了为每个任务启动线程的开销。

## 参数

| 参数           | 类型         | 说明                                                                                                                                                                                                       |
|----------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`        | worker 线程数。`0`（默认）—— 通过 [`Async\available_parallelism()`](/zh/docs/reference/available-parallelism.html) 自动检测。                                                                              |
| `$queueSize`   | `int`        | 待处理任务队列的最大长度。`0`（默认）—— `workers × 4`。队列已满时，`submit()` 会挂起调用协程，直到有空位。                                                                                                  |
| `$bootloader`  | `?\Closure`  | worker 启动初始化。闭包会被 deep-copy 一次，并在每个 worker 进入主任务循环**之前**执行。适合 autoload、连接池预热、opcache 预编译。如果 bootloader 抛出异常，整个池视为创建失败。                          |
| `$coroutine`   | `bool`       | 为 `true` 时，每个任务**作为协程**在它自己的子 scope 内启动，该子 scope 嵌套在 worker 的池 scope 中。任务内部可以 `await`、用 channel、做 IO、`spawn` —— 全部不会阻塞 OS 线程。                            |
| `$concurrency` | `int`        | 单个 worker 上同时存活的协程数上限。仅在 `coroutine: true` 时有效。`0`（默认）—— 不限。                                                                                                                    |

## 异常

`$workers < 0` 或 `$queueSize < 0` 时抛出 `\ValueError`。

## 示例

### 示例 #1 基本池创建

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 个 worker，队列大小取默认值
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### 示例 #2 显式指定队列大小

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 个 worker，队列最多 64 个待处理任务
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... 提交任务 ...

    $pool->close();
});
```

### 示例 #3 Bootloader —— worker 启动时初始化

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... submit 的任务会看到完全初始化好的环境 ...

    $pool->close();
});
```

### 示例 #4 协程模式 —— 任务内部可以 await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // 普通的阻塞调用会正确地把协程 park 住，
        // 而不是阻塞 worker 的 OS 线程
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### 示例 #5 按可用 CPU 自动检测 worker 数

```php
<?php

use Async\ThreadPool;

// workers: 0（默认） → Async\available_parallelism()
$pool = new ThreadPool();   // 考虑容器 cgroup 配额 / affinity
```

## 参见

- [ThreadPool::submit()](/zh/docs/reference/thread-pool/submit.html) —— 向池中添加任务
- [ThreadPool::close()](/zh/docs/reference/thread-pool/close.html) —— 优雅关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) —— 组件概览
- [`spawn_thread()`](/zh/docs/reference/spawn-thread.html) —— 用于单任务的一次性线程
