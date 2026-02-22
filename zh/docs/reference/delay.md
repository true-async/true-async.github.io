---
layout: docs
lang: zh
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /zh/docs/reference/delay.html
page_title: "delay()"
description: "delay() — 将协程挂起指定的毫秒数。"
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — 将当前协程的执行挂起指定的毫秒数。

## 描述

```php
delay(int $ms): void
```

挂起协程，将控制权交给调度器。经过 `$ms` 毫秒后，协程将被恢复。
在等待期间，其他协程继续执行。

## 参数

**`ms`**
等待时间（毫秒）。如果为 `0`，协程仅将控制权交给调度器（类似于 `suspend()`，但带有排队机制）。

## 返回值

没有返回值。

## 示例

### 示例 #1 基本用法

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // 等待 1 秒
    echo "1 second passed\n";
});
?>
```

### 示例 #2 周期性执行

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "Checking status...\n";
        delay(5000); // 每 5 秒
    }
});
?>
```

## 注意事项

> **注意：** `delay()` 不会阻塞整个 PHP 进程 — 仅当前协程被阻塞。

> **注意：** 如果调度器尚未启动，`delay()` 会自动启动调度器。

## 参见

- [suspend()](/zh/docs/reference/suspend.html) — 无延迟地让出控制权
- [timeout()](/zh/docs/reference/timeout.html) — 创建超时以限制等待时间
