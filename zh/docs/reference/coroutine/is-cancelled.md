---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "检查协程是否已被取消。"
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

检查协程是否已被取消**并且**已完成。仅当取消操作完全结束时才返回 `true`。

如果协程在 `protect()` 内部，即使已经调用了 `cancel()`，`isCancelled()` 也会返回 `false`，直到受保护区段完成。要检查是否已发出取消请求，请使用 `isCancellationRequested()`。

## 返回值

`bool` -- 如果协程已被取消并完成则返回 `true`。

## 示例

### 示例 #1 基本取消

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // 让取消操作完成

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### 示例 #2 使用 protect() 延迟取消

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // 关键区段 -- 取消被延迟
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// 已请求取消但尚未完成
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // 让 protect() 完成

var_dump($coroutine->isCancelled());             // bool(true)
```

## 参见

- [Coroutine::isCancellationRequested](/zh/docs/reference/coroutine/is-cancellation-requested.html) -- 检查取消请求
- [Coroutine::cancel](/zh/docs/reference/coroutine/cancel.html) -- 取消协程
- [Cancellation](/zh/docs/components/cancellation.html) -- 取消概念
