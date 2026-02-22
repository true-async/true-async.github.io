---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "获取协程创建时的文件和行号。"
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

返回调用 `spawn()` 创建此协程时的文件和行号。

## 返回值

`array` -- 包含两个元素的数组：
- `[0]` -- 文件名（`string` 或 `null`）
- `[1]` -- 行号（`int`）

## 示例

### 示例 #1 基本用法

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## 参见

- [Coroutine::getSpawnLocation](/zh/docs/reference/coroutine/get-spawn-location.html) -- 以字符串形式获取创建位置
- [Coroutine::getSuspendFileAndLine](/zh/docs/reference/coroutine/get-suspend-file-and-line.html) -- 挂起时的文件和行号
