---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "获取线程池自创建以来已完成的任务总数。"
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

返回自池创建以来，由该池中任意工作线程执行完成（无论成功还是抛出异常）的任务总数。该计数器单调递增，永不重置。它由原子变量支持，在任何时刻都是准确的。

无论任务是返回了值还是抛出了异常，工作线程执行完毕后该任务都计入已完成。

## 返回值

`int` — 自池创建以来已完成的任务总数。

## 示例

### 示例 #1 跟踪吞吐量

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

    delay(10);
    echo "completed so far: ", $pool->getCompletedCount(), "\n"; // 0 或更多

    foreach ($futures as $f) {
        await($f);
    }

    echo "completed total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## 参见

- [ThreadPool::getPendingCount()](/zh/docs/reference/thread-pool/get-pending-count.html) — 在队列中等待的任务
- [ThreadPool::getRunningCount()](/zh/docs/reference/thread-pool/get-running-count.html) — 当前正在执行的任务
- [ThreadPool::getWorkerCount()](/zh/docs/reference/thread-pool/get-worker-count.html) — 工作线程数量
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
