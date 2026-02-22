---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "检查协程是否已完成。"
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

检查协程是否已完成执行。协程在成功完成、异常完成或被取消时都视为已完成。

## 返回值

`bool` -- 如果协程已完成执行则返回 `true`。

## 示例

### 示例 #1 检查完成状态

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### 示例 #2 非阻塞的就绪检查

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// 等待所有任务完成
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## 参见

- [Coroutine::getResult](/zh/docs/reference/coroutine/get-result.html) -- 获取结果
- [Coroutine::getException](/zh/docs/reference/coroutine/get-exception.html) -- 获取异常
- [Coroutine::isCancelled](/zh/docs/reference/coroutine/is-cancelled.html) -- 检查是否已取消
