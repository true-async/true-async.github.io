---
layout: docs
lang: zh
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /zh/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "取消所有协程并关闭作用域。"
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

强制取消作用域中的所有协程并关闭它。调用 `dispose()` 后，作用域将被标记为已关闭和已取消。无法向已关闭的作用域添加新的协程。

这等同于先调用 `cancel()` 再关闭作用域。

## 返回值

没有返回值。

## 示例

### 示例 #1 强制关闭作用域

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// All coroutines will be cancelled, scope closed
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### 示例 #2 在 try/finally 块中清理

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Business logic
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## 参见

- [Scope::disposeSafely](/zh/docs/reference/scope/dispose-safely.html) — 安全关闭（使用僵尸协程）
- [Scope::disposeAfterTimeout](/zh/docs/reference/scope/dispose-after-timeout.html) — 超时后关闭
- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消但不关闭作用域
