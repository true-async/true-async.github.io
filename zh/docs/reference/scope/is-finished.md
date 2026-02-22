---
layout: docs
lang: zh
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /zh/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "检查作用域是否已完成。"
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

检查作用域中的所有协程是否已完成。当所有协程（包括子作用域中的协程）都执行完毕时，作用域被视为已完成。

## 返回值

`bool` — 如果作用域中的所有协程已完成则返回 `true`，否则返回 `false`。

## 示例

### 示例 #1 检查作用域完成状态

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## 参见

- [Scope::isClosed](/zh/docs/reference/scope/is-closed.html) — 检查作用域是否已关闭
- [Scope::isCancelled](/zh/docs/reference/scope/is-cancelled.html) — 检查作用域是否已取消
- [Scope::awaitCompletion](/zh/docs/reference/scope/await-completion.html) — 等待协程完成
