---
layout: docs
lang: zh
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /zh/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "检查作用域是否已被取消。"
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

检查作用域是否已被取消。作用域在调用 `cancel()` 或 `dispose()` 后被标记为已取消。

## 返回值

`bool` — 如果作用域已被取消则返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 检查作用域取消状态

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## 参见

- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消作用域
- [Scope::isFinished](/zh/docs/reference/scope/is-finished.html) — 检查作用域是否已完成
- [Scope::isClosed](/zh/docs/reference/scope/is-closed.html) — 检查作用域是否已关闭
