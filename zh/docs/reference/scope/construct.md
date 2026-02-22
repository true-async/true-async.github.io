---
layout: docs
lang: zh
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /zh/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "创建一个新的根作用域。"
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

创建一个新的根 `Scope`。根作用域没有父作用域，作为管理协程生命周期的独立单元。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### 示例 #2 创建多个独立的作用域

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// Cancelling one scope does not affect the other
$scopeA->cancel();

// $scopeB continues running
$scopeB->awaitCompletion();
```

## 参见

- [Scope::inherit](/zh/docs/reference/scope/inherit.html) — 创建子作用域
- [Scope::spawn](/zh/docs/reference/scope/spawn.html) — 在作用域中生成协程
