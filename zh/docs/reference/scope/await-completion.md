---
layout: docs
lang: zh
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /zh/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "等待作用域中的活跃协程执行完毕。"
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

等待作用域中所有**活跃**协程执行完毕。僵尸协程不在等待范围内。`$cancellation` 参数允许提前中断等待。

## 参数

`cancellation` — 一个 `Awaitable` 对象，当触发时将中断等待。

## 返回值

没有返回值。

## 示例

### 示例 #1 等待所有协程完成

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// Wait for completion with a 5-second timeout
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### 示例 #2 中断等待

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Very long task
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## 参见

- [Scope::awaitAfterCancellation](/zh/docs/reference/scope/await-after-cancellation.html) — 等待所有协程（包括僵尸协程）
- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消所有协程
- [Scope::isFinished](/zh/docs/reference/scope/is-finished.html) — 检查作用域是否已完成
