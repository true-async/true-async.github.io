---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "检查协程是否已被调度器启动。"
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

检查协程是否已被调度器启动。协程在调度器开始执行后被视为已启动。

## 返回值

`bool` -- 如果协程已启动则返回 `true`。

## 示例

### 示例 #1 启动前后的检查

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- 仍在队列中

suspend(); // 让调度器启动协程

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- 完成后仍为 true
```

## 参见

- [Coroutine::isQueued](/zh/docs/reference/coroutine/is-queued.html) -- 检查队列状态
- [Coroutine::isRunning](/zh/docs/reference/coroutine/is-running.html) -- 检查是否正在运行
- [Coroutine::isCompleted](/zh/docs/reference/coroutine/is-completed.html) -- 检查是否已完成
