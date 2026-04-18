---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "强制停止线程池，立即拒绝所有排队的任务。"
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

发起池的强制关闭。调用 `cancel()` 后：

- 任何后续的 `submit()` 调用将立即抛出 `Async\ThreadPoolException`。
- 在队列中等待的任务（尚未被工作线程取走）将被**立即拒绝** — 其对应的 `Future` 对象以 `ThreadPoolException` 进入拒绝状态。
- 已在工作线程中执行的任务会运行至当前任务完成（强制中断线程内的 PHP 代码是不可能的）。
- 工作线程在完成当前任务后停止，不再从队列中取新任务。

如需等待所有已排队任务完成后再关闭，请改用 [`close()`](/zh/docs/reference/thread-pool/close.html)。

## 返回值

`void`

## 示例

### 示例 #1 有排队任务时执行强制取消

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // 跨 2 个工作线程填满 8 个任务
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // 立即取消 — 队列中的任务被拒绝
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

    echo "done:      $done\n";      // 2  (调用 cancel() 时已在运行)
    echo "cancelled: $cancelled\n"; // 6  (仍在队列中)
});
```

## 参见

- [ThreadPool::close()](/zh/docs/reference/thread-pool/close.html) — 优雅关闭
- [ThreadPool::isClosed()](/zh/docs/reference/thread-pool/is-closed.html) — 检查池是否已关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述及 close() 与 cancel() 的比较
