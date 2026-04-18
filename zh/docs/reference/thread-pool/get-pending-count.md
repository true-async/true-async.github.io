---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "获取线程池队列中等待的任务数量。"
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

返回已提交但尚未被工作线程取走的任务数量。该计数器由原子变量支持，即使工作线程并行运行，在任何时刻也都是准确的。

## 返回值

`int` — 当前在队列中等待的任务数量。

## 示例

### 示例 #1 观察队列排空过程

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // 让工作线程启动

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## 参见

- [ThreadPool::getRunningCount()](/zh/docs/reference/thread-pool/get-running-count.html) — 当前正在执行的任务
- [ThreadPool::getCompletedCount()](/zh/docs/reference/thread-pool/get-completed-count.html) — 已完成的任务总数
- [ThreadPool::getWorkerCount()](/zh/docs/reference/thread-pool/get-worker-count.html) — 工作线程数量
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
