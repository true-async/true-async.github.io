---
layout: docs
lang: zh
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /zh/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "为子协程设置异常处理器。"
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

为作用域中子协程抛出的异常设置处理器。当协程以未处理的异常结束时，不会将错误向上传播，而是调用指定的处理器。

## 参数

`exceptionHandler` — 异常处理函数。接受一个 `\Throwable` 作为参数。

## 返回值

没有返回值。

## 示例

### 示例 #1 处理协程错误

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// Log will contain: "Coroutine error: Something went wrong"
```

### 示例 #2 集中式错误日志记录

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## 参见

- [Scope::setChildScopeExceptionHandler](/zh/docs/reference/scope/set-child-scope-exception-handler.html) — 子作用域的异常处理器
- [Scope::finally](/zh/docs/reference/scope/on-finally.html) — 作用域完成时的回调
