---
layout: docs
lang: zh
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /zh/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "在指定超时后关闭作用域。"
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

安排作用域在指定超时后关闭。当超时到期时，将调用 `dispose()`，取消所有协程并关闭作用域。这对于设置作用域的最大生命周期非常方便。

## 参数

`timeout` — 自动关闭作用域前的等待时间（毫秒）。

## 返回值

没有返回值。

## 示例

### 示例 #1 限制执行时间

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope will be closed after 10 seconds
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Long operation
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### 示例 #2 限定生命周期的作用域

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 seconds for all work

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Won't finish in time
    echo "Task 3: OK\n"; // Will not be printed
});

$scope->awaitCompletion();
```

## 参见

- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 立即关闭作用域
- [Scope::disposeSafely](/zh/docs/reference/scope/dispose-safely.html) — 安全关闭作用域
- [timeout()](/zh/docs/reference/timeout.html) — 全局超时函数
