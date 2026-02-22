---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "检查协程是否在调度器队列中。"
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

检查协程是否在调度器的执行队列中。

## 返回值

`bool` -- 如果协程在队列中则返回 `true`。

## 示例

### 示例 #1 队列状态

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- 等待启动

suspend(); // 让调度器启动协程

// 协程已启动，但在内部 suspend() 后仍在队列中
var_dump($coroutine->isStarted()); // bool(true)
```

## 参见

- [Coroutine::isStarted](/zh/docs/reference/coroutine/is-started.html) -- 检查是否已启动
- [Coroutine::isSuspended](/zh/docs/reference/coroutine/is-suspended.html) -- 检查挂起状态
