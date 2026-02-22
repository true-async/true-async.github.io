---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "获取挂起协程的调用栈。"
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

返回挂起协程的调用栈（回溯）。如果协程未处于挂起状态（尚未启动、正在运行或已完成），则返回 `null`。

## 参数

**options**
: 选项的位掩码，类似于 `debug_backtrace()`：
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- 在跟踪中包含 `$this`
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- 不包含函数参数

**limit**
: 最大栈帧数。`0` -- 无限制。

## 返回值

`?array` -- 栈帧数组，如果协程未处于挂起状态则返回 `null`。

## 示例

### 示例 #1 获取挂起协程的调用栈

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // 让协程启动并挂起

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### 示例 #2 已完成协程的跟踪 -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// 启动前 -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// 完成后 -- null
var_dump($coroutine->getTrace()); // NULL
```

## 参见

- [Coroutine::isSuspended](/zh/docs/reference/coroutine/is-suspended.html) -- 检查挂起状态
- [Coroutine::getSuspendLocation](/zh/docs/reference/coroutine/get-suspend-location.html) -- 挂起位置
- [Coroutine::getSpawnLocation](/zh/docs/reference/coroutine/get-spawn-location.html) -- 创建位置
