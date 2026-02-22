---
layout: docs
lang: zh
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /zh/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — 挂起当前协程的执行。完整文档：协作式多任务示例。"
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — 挂起当前协程的执行

## 描述

```php
suspend: void
```

挂起当前协程的执行并将控制权交给调度器。
协程的执行将在稍后调度器决定运行它时恢复。

`suspend()` 是 True Async 扩展提供的函数。

## 参数

此构造没有参数。

## 返回值

该函数没有返回值。

## 示例

### 示例 #1 suspend 的基本用法

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Before suspend\n";
    suspend();
    echo "After suspend\n";
});

echo "Main code\n";
?>
```

**输出：**
```
Before suspend
Main code
After suspend
```

### 示例 #2 多次 suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine started\n";
?>
```

**输出：**
```
Iteration 1
Coroutine started
Iteration 2
Iteration 3
```

### 示例 #3 协作式多任务

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // 给其他协程运行的机会
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**输出：**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### 示例 #4 显式让出控制权

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starting long work\n";

    for ($i = 0; $i < 1000000; $i++) {
        // 计算

        if ($i % 100000 === 0) {
            suspend(); // 定期让出控制权
        }
    }

    echo "Work completed\n";
});

spawn(function() {
    echo "Other coroutine is also working\n";
});
?>
```

### 示例 #5 从嵌套函数中 suspend

`suspend()` 可以在任何调用深度工作 — 不需要直接从协程中调用：

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Nested function: before suspend\n";
    suspend();
    echo "Nested function: after suspend\n";
}

function deeplyNested() {
    echo "Deep call: start\n";
    nestedSuspend();
    echo "Deep call: end\n";
}

spawn(function() {
    echo "Coroutine: before nested call\n";
    deeplyNested();
    echo "Coroutine: after nested call\n";
});

spawn(function() {
    echo "Other coroutine: working\n";
});
?>
```

**输出：**
```
Coroutine: before nested call
Deep call: start
Nested function: before suspend
Other coroutine: working
Nested function: after suspend
Deep call: end
Coroutine: after nested call
```

### 示例 #6 在等待循环中使用 suspend

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // 等待标志变为 true
    while (!$ready) {
        suspend(); // 让出控制权
    }

    echo "Condition met!\n";
});

spawn(function() use (&$ready) {
    echo "Preparing...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Ready!\n";
});
?>
```

**输出：**
```
Preparing...
Ready!
Condition met!
```

## 注意事项

> **注意：** `suspend()` 是一个函数。以 `suspend`（不带括号）调用是不正确的。

> **注意：** 在 TrueAsync 中，所有执行中的代码都被视为协程，
> 因此 `suspend()` 可以在任何地方调用（包括主脚本）。

> **注意：** 调用 `suspend()` 后，协程不会立即恢复执行，
> 而是在调度器决定运行它时恢复。协程恢复的顺序不保证。

> **注意：** 在大多数情况下，不需要显式使用 `suspend()`。
> 协程在执行 I/O 操作（文件读取、网络请求等）时会自动挂起。

> **注意：** 在没有 I/O 操作的无限循环中使用 `suspend()`
> 可能导致 CPU 使用率过高。您也可以使用 `Async\timeout()`。

## 变更日志

| 版本      | 说明                              |
|-----------|-----------------------------------|
| 1.0.0     | 添加了 `suspend()` 函数          |

## 参见

- [spawn()](/zh/docs/reference/spawn.html) - 启动协程
- [await()](/zh/docs/reference/await.html) - 等待协程结果
