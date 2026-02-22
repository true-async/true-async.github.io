---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "获取协程的唯一标识符。"
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

返回协程的唯一整数标识符。该标识符在当前 PHP 进程内是唯一的。

## 返回值

`int` -- 唯一的协程标识符。

## 示例

### 示例 #1 基本用法

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### 示例 #2 带标识符的日志记录

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' started\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completed\n";
    });
}
```

## 参见

- [Coroutine::getSpawnLocation](/zh/docs/reference/coroutine/get-spawn-location.html) -- 协程创建位置
- [current_coroutine()](/zh/docs/reference/current-coroutine.html) -- 获取当前协程
