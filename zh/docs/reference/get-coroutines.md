---
layout: docs
lang: zh
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /zh/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — 获取所有活跃协程的列表，用于诊断。"
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — 返回所有活跃协程的数组。适用于诊断和监控。

## 描述

```php
get_coroutines(): array
```

## 返回值

`Async\Coroutine` 对象数组 — 当前请求中注册的所有协程。

## 示例

### 示例 #1 监控协程

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// 让协程启动
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, spawned at %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'suspended' : 'running',
        $coro->getSpawnLocation()
    );
}
?>
```

### 示例 #2 检测泄漏

```php
<?php
use function Async\get_coroutines;

// 在请求结束时，检查未完成的协程
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Unfinished coroutine: " . $coro->getSpawnLocation());
    }
}
?>
```

## 参见

- [current_coroutine()](/zh/docs/reference/current-coroutine.html) — 当前协程
- [Coroutines](/zh/docs/components/coroutines.html) — 协程概念
