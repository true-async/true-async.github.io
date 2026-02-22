---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "获取协程挂起时的文件和行号。"
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

返回协程被挂起（或最后一次挂起）时的文件和行号。

## 返回值

`array` -- 包含两个元素的数组：
- `[0]` -- 文件名（`string` 或 `null`）
- `[1]` -- 行号（`int`）

## 示例

### 示例 #1 基本用法

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // 让协程挂起

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## 参见

- [Coroutine::getSuspendLocation](/zh/docs/reference/coroutine/get-suspend-location.html) -- 以字符串形式获取挂起位置
- [Coroutine::getSpawnFileAndLine](/zh/docs/reference/coroutine/get-spawn-file-and-line.html) -- 创建时的文件和行号
