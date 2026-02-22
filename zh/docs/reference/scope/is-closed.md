---
layout: docs
lang: zh
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "检查作用域是否已关闭。"
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

检查作用域是否已关闭。作用域在调用 `dispose()` 或 `disposeSafely()` 后被视为已关闭。无法向已关闭的作用域添加新的协程。

## 返回值

`bool` — 如果作用域已关闭则返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 检查作用域状态

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### 示例 #2 防止向已关闭的作用域添加协程

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## 参见

- [Scope::isFinished](/zh/docs/reference/scope/is-finished.html) — 检查作用域是否已完成
- [Scope::isCancelled](/zh/docs/reference/scope/is-cancelled.html) — 检查作用域是否已取消
- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 关闭作用域
