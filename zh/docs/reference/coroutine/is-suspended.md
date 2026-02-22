---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "检查协程是否处于挂起状态。"
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

检查协程是否处于挂起状态。协程在调用 `suspend()` 时、进行 I/O 操作时或使用 `await()` 等待时会进入挂起状态。

## 返回值

`bool` -- 如果协程处于挂起状态则返回 `true`。

## 示例

### 示例 #1 检查挂起状态

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // 让协程启动并挂起

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## 参见

- [Coroutine::isRunning](/zh/docs/reference/coroutine/is-running.html) -- 检查执行状态
- [Coroutine::getTrace](/zh/docs/reference/coroutine/get-trace.html) -- 挂起协程的调用栈
- [suspend()](/zh/docs/reference/suspend.html) -- 挂起当前协程
