---
layout: docs
lang: zh
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /zh/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "为子作用域设置异常处理器。"
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

为子作用域中抛出的异常设置处理器。当子作用域以错误结束时，将调用此处理器，防止异常传播到父作用域。

## 参数

`exceptionHandler` — 子作用域的异常处理函数。接受一个 `\Throwable` 作为参数。

## 返回值

没有返回值。

## 示例

### 示例 #1 捕获子作用域错误

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// Error handled, does not propagate to $parentScope
```

### 示例 #2 模块间错误隔离

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// Each module in its own scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // An error here will not affect $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## 参见

- [Scope::setExceptionHandler](/zh/docs/reference/scope/set-exception-handler.html) — 协程的异常处理器
- [Scope::inherit](/zh/docs/reference/scope/inherit.html) — 创建子作用域
- [Scope::getChildScopes](/zh/docs/reference/scope/get-child-scopes.html) — 获取子作用域
