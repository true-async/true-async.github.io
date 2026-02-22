---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "取消协程执行。"
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

取消协程的执行。协程将在下一个挂起点（`suspend`、`await`、`delay` 等）收到 `AsyncCancellation` 异常。

取消操作是协作式的——协程不会被立即中断。如果协程正在 `protect()` 内部，取消将被推迟到受保护区段完成后。

## 参数

**cancellation**
: 作为取消原因的异常。如果为 `null`，则创建默认的 `AsyncCancellation`。

## 示例

### 示例 #1 基本取消

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### 示例 #2 带原因的取消

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout exceeded"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout exceeded"
}
```

### 示例 #3 启动前取消

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// 在调度器启动协程之前取消
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## 参见

- [Coroutine::isCancelled](/zh/docs/reference/coroutine/is-cancelled.html) -- 检查是否已取消
- [Coroutine::isCancellationRequested](/zh/docs/reference/coroutine/is-cancellation-requested.html) -- 检查取消请求
- [Cancellation](/zh/docs/components/cancellation.html) -- 取消概念
- [protect()](/zh/docs/reference/protect.html) -- 受保护区段
