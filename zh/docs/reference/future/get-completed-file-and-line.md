---
layout: docs
lang: zh
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /zh/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "以数组形式返回 Future 的完成位置。"
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

返回 `Future` 完成位置的信息（即在关联的 `FutureState` 上调用 `complete()` 或 `fail()` 的位置）。包含文件名和行号。适用于调试和追踪异步链。

## 返回值

`array` — 包含键 `file`（字符串，文件路径）和 `line`（整数，行号）的数组。如果 Future 尚未完成，返回空数组。

## 示例

### 示例 #1 获取完成位置

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // line 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### 示例 #2 比较创建位置和完成位置

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## 参见

- [Future::getCompletedLocation](/zh/docs/reference/future/get-completed-location.html) — 完成位置（字符串形式）
- [Future::getCreatedFileAndLine](/zh/docs/reference/future/get-created-file-and-line.html) — Future 的创建位置
- [Future::getAwaitingInfo](/zh/docs/reference/future/get-awaiting-info.html) — 等待者信息
