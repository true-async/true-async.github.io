---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "检查协程是否正在执行。"
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

检查协程是否正在执行。协程在已启动且尚未完成时被视为正在运行。

## 返回值

`bool` -- 如果协程正在运行且未完成则返回 `true`。

## 示例

### 示例 #1 检查执行状态

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // 在协程内部 isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// 在外部 -- 协程已挂起或尚未启动
var_dump($coroutine->isRunning()); // bool(false)
```

## 参见

- [Coroutine::isStarted](/zh/docs/reference/coroutine/is-started.html) -- 检查是否已启动
- [Coroutine::isSuspended](/zh/docs/reference/coroutine/is-suspended.html) -- 检查挂起状态
- [Coroutine::isCompleted](/zh/docs/reference/coroutine/is-completed.html) -- 检查是否已完成
