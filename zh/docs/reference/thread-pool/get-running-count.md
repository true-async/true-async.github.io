---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "获取当前在工作线程中执行的任务数量。"
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

返回当前由工作线程执行中的任务数量（即已从队列中取出但尚未完成的任务）。最大值受工作线程数量限制。该计数器由原子变量支持，在任何时刻都是准确的。

## 返回值

`int` — 所有工作线程中当前正在执行的任务数量。

## 示例

### 示例 #1 在任务执行时观察运行计数

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

    delay(10); // 给工作线程时间启动

    echo "workers: ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "running: ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "running: ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## 参见

- [ThreadPool::getPendingCount()](/zh/docs/reference/thread-pool/get-pending-count.html) — 在队列中等待的任务
- [ThreadPool::getCompletedCount()](/zh/docs/reference/thread-pool/get-completed-count.html) — 已完成的任务总数
- [ThreadPool::getWorkerCount()](/zh/docs/reference/thread-pool/get-worker-count.html) — 工作线程数量
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
