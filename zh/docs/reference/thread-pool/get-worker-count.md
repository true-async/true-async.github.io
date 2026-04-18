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

返回池中工作线程的数量。该值在构造时固定，在池的整个生命周期内不会改变。它等于传递给 [`new ThreadPool()`](/zh/docs/reference/thread-pool/__construct.html) 的 `$workers` 参数值。

## 返回值

`int` — 工作线程数量（与构造函数中设置的一致）。

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
