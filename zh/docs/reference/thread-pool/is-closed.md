---
layout: docs
lang: zh
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "检查线程池是否已关闭。"
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

如果池已通过 [`close()`](/zh/docs/reference/thread-pool/close.html) 或 [`cancel()`](/zh/docs/reference/thread-pool/cancel.html) 关闭，则返回 `true`。如果池仍在接受任务，则返回 `false`。

## 返回值

`bool` — 如果池已关闭则为 `true`；如果仍处于活跃状态则为 `false`。

## 示例

### 示例 #1 提交前检查状态

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### 示例 #2 在共享上下文中保护 submit

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## 参见

- [ThreadPool::close()](/zh/docs/reference/thread-pool/close.html) — 优雅关闭
- [ThreadPool::cancel()](/zh/docs/reference/thread-pool/cancel.html) — 强制关闭
- [Async\ThreadPool](/zh/docs/components/thread-pool.html) — 组件概述
