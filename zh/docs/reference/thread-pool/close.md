---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "优雅地关闭线程池，等待所有排队和运行中的任务完成。"
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

发起池的优雅关闭。调用 `close()` 后：

- 任何后续的 `submit()` 调用将立即抛出 `Async\ThreadPoolException`。
- 已在队列中的任务继续正常完成。
- 当前在工作线程中执行的任务正常完成。
- 该方法会阻塞调用协程，直到所有进行中的任务完成且所有工作线程停止。

如需立即强制关闭并丢弃排队任务，请改用 [`cancel()`](/zh/docs/reference/thread-pool/cancel.html)。

## 返回值

`void`

## 示例

### 示例 #1 提交所有任务后优雅关闭

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // 等待上面的任务完成

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### 示例 #2 关闭后提交将抛出异常

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## 参见

- [ThreadPool::cancel()](/zh/docs/reference/thread-pool/cancel.html) — 强制关闭
- [ThreadPool::isClosed()](/zh/docs/reference/thread-pool/is-closed.html) — 检查池是否已关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
