---
layout: docs
lang: zh
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /zh/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — 获取当前正在执行的协程对象。"
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — 返回当前正在执行的协程对象。

## 描述

```php
current_coroutine(): Async\Coroutine
```

## 返回值

表示当前协程的 `Async\Coroutine` 对象。

## 错误/异常

`Async\AsyncException` — 如果在协程外部调用。

## 示例

### 示例 #1 获取协程 ID

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### 示例 #2 诊断信息

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Spawned from: " . $coro->getSpawnLocation() . "\n";
    echo "Status: " . ($coro->isRunning() ? 'running' : 'suspended') . "\n";
});
?>
```

## 参见

- [get_coroutines()](/zh/docs/reference/get-coroutines.html) — 所有协程列表
- [Coroutines](/zh/docs/components/coroutines.html) — 协程概念
