---
layout: docs
lang: zh
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /zh/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "创建一个从指定或当前作用域继承的新作用域。"
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

创建一个从指定父作用域继承的新 `Scope`。如果未提供 `$parentScope` 参数（或为 `null`），则新作用域从当前活跃作用域继承。

子作用域从父作用域继承异常处理器和取消策略。

## 参数

`parentScope` — 新作用域将从中继承的父作用域。如果为 `null`，则使用当前活跃作用域。

## 返回值

`Scope` — 新的子作用域。

## 示例

### 示例 #1 从当前作用域创建子作用域

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Inside the coroutine, the current scope is $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### 示例 #2 显式指定父作用域

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// Cancelling the parent also cancels the child scope
$rootScope->cancel();
```

## 参见

- [Scope::\_\_construct](/zh/docs/reference/scope/construct.html) — 创建根作用域
- [Scope::getChildScopes](/zh/docs/reference/scope/get-child-scopes.html) — 获取子作用域
- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 取消并关闭作用域
