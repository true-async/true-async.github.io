---
layout: docs
lang: zh
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /zh/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "安全关闭作用域——协程变为僵尸协程。"
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

安全关闭作用域。活跃的协程**不会被取消**，而是变为僵尸协程：它们继续运行，但作用域被视为已关闭。僵尸协程在完成工作后会自行结束。

如果作用域通过 `asNotSafely()` 被标记为"非安全"，则协程会被取消而非变为僵尸协程。

## 返回值

没有返回值。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// Scope is closed, but the coroutine continues running
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Coroutine continues executing in the background
```

### 示例 #2 带僵尸协程等待的优雅关闭

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// Wait for zombie coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## 参见

- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 强制关闭作用域
- [Scope::asNotSafely](/zh/docs/reference/scope/as-not-safely.html) — 禁用僵尸协程行为
- [Scope::awaitAfterCancellation](/zh/docs/reference/scope/await-after-cancellation.html) — 等待僵尸协程完成
