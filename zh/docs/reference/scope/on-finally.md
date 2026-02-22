---
layout: docs
lang: zh
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /zh/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "注册一个在作用域完成时调用的回调函数。"
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

注册一个在作用域完成时执行的回调函数。这相当于作用域的 `finally` 块，保证无论作用域如何结束（正常完成、被取消或出现错误），清理代码都会运行。

## 参数

`callback` — 作用域完成时将被调用的闭包。

## 返回值

没有返回值。

## 示例

### 示例 #1 资源清理

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // Close connections, delete temporary files
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// Output: "Executing task"
// Output: "Scope completed, cleaning up resources"
```

### 示例 #2 多个回调

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Both callbacks will be invoked when the scope completes
```

## 参见

- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 关闭作用域
- [Scope::isFinished](/zh/docs/reference/scope/is-finished.html) — 检查作用域是否已完成
- [Coroutine::finally](/zh/docs/reference/coroutine/on-finally.html) — 协程完成时的回调
