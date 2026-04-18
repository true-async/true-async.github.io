---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "向线程池提交任务并获取其结果的 Future。"
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

将任务添加到池的内部队列中。空闲的工作线程取走任务执行，并以返回值解析返回的 `Future`。如果队列已满，调用协程将被挂起，直到有空位。

## 参数

| 参数       | 类型       | 说明                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | 在工作线程中执行的可调用对象。深拷贝到工作线程中 — 捕获对象或资源的闭包将抛出 `Async\ThreadTransferException`。 |
| `...$args`| `mixed`    | 传递给 `$task` 的额外参数。同样会被深拷贝。                                                           |

## 返回值

`Async\Future` — 以 `$task` 的返回值解析，或以 `$task` 抛出的任何异常拒绝。

## 异常

- `Async\ThreadPoolException` — 如果池已通过 `close()` 或 `cancel()` 关闭，则立即抛出。
- `Async\ThreadTransferException` — 如果 `$task` 或任何参数无法序列化以进行传输（例如 `stdClass`、PHP 引用、资源）。

## 示例

### 示例 #1 基本提交与等待

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### 示例 #2 处理任务抛出的异常

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### 示例 #3 并行提交多个任务

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## 参见

- [ThreadPool::map()](/zh/docs/reference/thread-pool/map.html) — 对数组执行并行映射
- [ThreadPool::close()](/zh/docs/reference/thread-pool/close.html) — 优雅关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述及数据传输规则
