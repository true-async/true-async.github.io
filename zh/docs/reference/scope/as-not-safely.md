---
layout: docs
lang: zh
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /zh/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "将作用域标记为非安全模式——协程将收到取消信号，而非变为僵尸协程。"
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

将作用域标记为"非安全"模式。当对这样的作用域调用 `disposeSafely()` 时，协程**不会**变为僵尸协程，而是会收到取消信号。这适用于不需要保证执行完成的后台任务。

该方法返回相同的作用域对象，支持方法链式调用（流式接口）。

## 返回值

`Scope` — 相同的作用域对象（用于链式调用）。

## 示例

### 示例 #1 用于后台任务的作用域

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Background task: cache cleanup
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// With disposeSafely(), coroutines will be cancelled instead of becoming zombies
$scope->disposeSafely();
```

### 示例 #2 与 inherit 配合使用

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// On close: coroutines will be cancelled, not turned into zombies
$bgScope->disposeSafely();
```

## 参见

- [Scope::disposeSafely](/zh/docs/reference/scope/dispose-safely.html) — 安全关闭作用域
- [Scope::dispose](/zh/docs/reference/scope/dispose.html) — 强制关闭作用域
- [Scope::cancel](/zh/docs/reference/scope/cancel.html) — 取消所有协程
