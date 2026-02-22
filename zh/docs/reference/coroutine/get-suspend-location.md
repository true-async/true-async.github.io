---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "以字符串形式获取协程的挂起位置。"
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

以 `"file:line"` 格式返回协程的挂起位置。如果信息不可用，则返回 `"unknown"`。

## 返回值

`string` -- 类似 `"/app/script.php:42"` 或 `"unknown"` 的字符串。

## 示例

### 示例 #1 诊断卡住的协程

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // 卡在这里
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## 参见

- [Coroutine::getSuspendFileAndLine](/zh/docs/reference/coroutine/get-suspend-file-and-line.html) -- 以数组形式获取文件和行号
- [Coroutine::getSpawnLocation](/zh/docs/reference/coroutine/get-spawn-location.html) -- 创建位置
- [Coroutine::getTrace](/zh/docs/reference/coroutine/get-trace.html) -- 完整调用栈
