---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "创建一个具有固定工作线程数的新 ThreadPool。"
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

创建一个新的线程池，并立即启动所有工作线程。工作线程在池的整个生命周期内保持活跃，消除了每个任务的线程启动开销。

## 参数

| 参数         | 类型  | 说明                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | 要创建的工作线程数量。必须 ≥ 1。所有线程在构造时启动。                |
| `$queueSize` | `int` | 可在队列中等待的最大任务数。`0`（默认值）表示 `$workers × 4`。当队列已满时，`submit()` 会挂起调用协程，直到有空位可用。 |

## 异常

如果 `$workers < 1`，则抛出 `\ValueError`。

## 示例

### 示例 #1 基本池创建

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 个工作线程，队列大小默认为 16
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
    // 4 个工作线程，队列最多容纳 64 个待处理任务
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... 提交任务 ...

    $pool->close();
});
```

## 参见

- [ThreadPool::submit()](/zh/docs/reference/thread-pool/submit.html) — 向池中添加任务
- [ThreadPool::close()](/zh/docs/reference/thread-pool/close.html) — 优雅关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
- [`spawn_thread()`](/zh/docs/reference/spawn-thread.html) — 用于单个任务的一次性线程
