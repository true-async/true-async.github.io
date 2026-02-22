---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "检查是否已请求取消协程。"
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

检查是否已请求取消协程。与 `isCancelled()` 不同，即使协程仍在 `protect()` 内部执行，只要调用了 `cancel()` 就会立即返回 `true`。

## 返回值

`bool` -- 如果已请求取消则返回 `true`。

## 示例

### 示例 #1 与 isCancelled() 的区别

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// 取消前
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// cancel() 调用后立即检查
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- 仍在 protect() 中
```

## 参见

- [Coroutine::isCancelled](/zh/docs/reference/coroutine/is-cancelled.html) -- 检查取消是否已完成
- [Coroutine::cancel](/zh/docs/reference/coroutine/cancel.html) -- 取消协程
- [protect()](/zh/docs/reference/protect.html) -- 受保护区段
