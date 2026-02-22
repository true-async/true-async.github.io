---
layout: docs
lang: zh
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /zh/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "在作用域取消后等待所有协程（包括僵尸协程）执行完毕。"
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

等待作用域中**所有**协程执行完毕，包括僵尸协程。需要事先调用 `cancel()`。此方法用于优雅终止作用域，当你需要等待所有协程（包括僵尸协程）完成工作时使用。

## 参数

`errorHandler` — 用于处理僵尸协程错误的回调函数。接受一个 `\Throwable` 作为参数。如果为 `null`，则忽略错误。

`cancellation` — 用于中断等待的 `Awaitable` 对象。如果为 `null`，则等待没有时间限制。

## 返回值

没有返回值。

## 示例

### 示例 #1 带错误处理的优雅终止

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// First, cancel
$scope->cancel();

// Then wait for all coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### 示例 #2 带超时的等待

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie coroutine that takes a long time to finish
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Resource cleanup
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## 参见

- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消所有协程
- [Scope::awaitCompletion](/zh/docs/reference/scope/await-completion.html) — 等待活跃协程完成
- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 取消并关闭作用域
