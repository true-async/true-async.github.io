---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "以字符串形式获取协程的创建位置。"
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

以 `"file:line"` 格式返回协程的创建位置。如果信息不可用，则返回 `"unknown"`。

## 返回值

`string` -- 类似 `"/app/script.php:42"` 或 `"unknown"` 的字符串。

## 示例

### 示例 #1 调试输出

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### 示例 #2 记录所有协程日志

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## 参见

- [Coroutine::getSpawnFileAndLine](/zh/docs/reference/coroutine/get-spawn-file-and-line.html) -- 以数组形式获取文件和行号
- [Coroutine::getSuspendLocation](/zh/docs/reference/coroutine/get-suspend-location.html) -- 挂起位置
- [get_coroutines()](/zh/docs/reference/get-coroutines.html) -- 所有活跃的协程
