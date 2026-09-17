---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "获取线程池中工作线程的数量。"
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

返回池中此刻正在运行的工作线程数量。初始值等于传递给 [`new ThreadPool()`](/zh/docs/reference/thread-pool/__construct.html) 的 `$workers` 参数值，并随着工作线程退出而减少。

## 返回值

`int` — 当前正在运行的工作线程数量。线程结束时会从计数中移除，因此已关闭的池在其工作线程全部退出后返回 0，而丢失了一个线程的池返回的数值比构造时设置的少一。

## 示例

### 示例 #1 确认工作线程数量

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

### 示例 #2 根据可用 CPU 核心数调整池大小

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

## 参见

- [ThreadPool::getPendingCount()](/zh/docs/reference/thread-pool/get-pending-count.html) — 在队列中等待的任务
- [ThreadPool::getRunningCount()](/zh/docs/reference/thread-pool/get-running-count.html) — 当前正在执行的任务
- [ThreadPool::getCompletedCount()](/zh/docs/reference/thread-pool/get-completed-count.html) — 已完成的任务总数
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
