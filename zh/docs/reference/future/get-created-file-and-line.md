---
layout: docs
lang: zh
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /zh/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "以数组形式返回 Future 的创建位置。"
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

以数组形式返回 `Future` 创建位置的信息。包含创建此 Future 的文件名和行号。适用于调试和追踪。

## 返回值

`array` — 包含键 `file`（字符串，文件路径）和 `line`（整数，行号）的数组。

## 示例

### 示例 #1 获取创建位置

```php
<?php

use Async\Future;

$future = Future::completed(42); // line 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### 示例 #2 记录 Future 信息

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## 参见

- [Future::getCreatedLocation](/zh/docs/reference/future/get-created-location.html) — 创建位置（字符串形式）
- [Future::getCompletedFileAndLine](/zh/docs/reference/future/get-completed-file-and-line.html) — Future 的完成位置
- [Future::getAwaitingInfo](/zh/docs/reference/future/get-awaiting-info.html) — 等待者信息
