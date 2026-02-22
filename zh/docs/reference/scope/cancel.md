---
layout: docs
lang: zh
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /zh/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "取消作用域中的所有协程。"
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

取消属于给定作用域的所有协程。每个活跃协程将收到一个 `CancelledException`。如果指定了 `$cancellationError`，它将作为取消原因。

## 参数

`cancellationError` — 自定义取消异常。如果为 `null`，则使用标准的 `CancelledException`。

## 返回值

没有返回值。

## 示例

### 示例 #1 基本取消

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Long operation
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// Cancel all coroutines
$scope->cancel();
```

### 示例 #2 带自定义错误的取消

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## 参见

- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 取消并关闭作用域
- [Scope::isCancelled](/zh/docs/reference/scope/is-cancelled.html) — 检查作用域是否已取消
- [Scope::awaitAfterCancellation](/zh/docs/reference/scope/await-after-cancellation.html) — 取消后等待
