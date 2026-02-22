---
layout: docs
lang: zh
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /zh/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "在给定作用域中生成一个协程。"
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

在给定作用域中生成一个新的协程。协程将绑定到该作用域并由其生命周期管理：当作用域被取消或关闭时，其所有协程也会受到影响。

## 参数

`callable` — 将作为协程执行的闭包。

`params` — 传递给闭包的参数。

## 返回值

`Coroutine` — 生成的协程对象。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### 示例 #2 传递参数

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... perform the request
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## 参见

- [spawn()](/zh/docs/reference/spawn.html) — 生成协程的全局函数
- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消作用域中的所有协程
- [Scope::awaitCompletion](/zh/docs/reference/scope/await-completion.html) — 等待协程完成
