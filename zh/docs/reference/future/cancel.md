---
layout: docs
lang: zh
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /zh/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "取消 Future。"
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

取消 `Future`。所有通过 `await()` 等待此 Future 的协程将收到 `CancelledException`。如果提供了 `$cancellation` 参数，它将作为取消原因。

## 参数

`cancellation` — 自定义取消异常。如果为 `null`，则使用默认的 `CancelledException`。

## 返回值

该函数不返回值。

## 示例

### 示例 #1 基本的 Future 取消

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// 等待结果的协程
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// 取消 Future
$future->cancel();
```

### 示例 #2 带自定义原因的取消

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## 参见

- [Future::isCancelled](/zh/docs/reference/future/is-cancelled.html) — 检查 Future 是否已取消
- [Future::await](/zh/docs/reference/future/await.html) — 等待结果
- [Future::catch](/zh/docs/reference/future/catch.html) — 处理 Future 错误
