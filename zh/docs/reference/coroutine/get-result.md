---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "获取协程的执行结果。"
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

返回协程的执行结果。如果协程尚未完成，则返回 `null`。

**重要：**此方法不会等待协程完成。如需等待请使用 `await()`。

## 返回值

`mixed` -- 协程的结果，如果协程尚未完成则返回 `null`。

## 示例

### 示例 #1 基本用法

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// 完成前
var_dump($coroutine->getResult()); // NULL

// 等待完成
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### 示例 #2 配合 isCompleted() 检查

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // 让协程完成

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## 参见

- [Coroutine::getException](/zh/docs/reference/coroutine/get-exception.html) -- 获取异常
- [Coroutine::isCompleted](/zh/docs/reference/coroutine/is-completed.html) -- 检查是否已完成
- [await()](/zh/docs/reference/await.html) -- 等待结果
