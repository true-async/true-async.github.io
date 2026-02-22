---
layout: docs
lang: zh
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /zh/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "等待中协程的调试信息。"
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

返回当前正在等待此 `Future` 完成的协程的调试信息。适用于诊断死锁和分析协程之间的依赖关系。

## 返回值

`array` — 包含等待中协程信息的数组。

## 示例

### 示例 #1 获取等待者信息

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Launch several coroutines awaiting one Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Give coroutines time to start waiting
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array with information about awaiting coroutines

$state->complete("done");
```

## 参见

- [Future::getCreatedFileAndLine](/zh/docs/reference/future/get-created-file-and-line.html) — Future 的创建位置
- [Future::getCreatedLocation](/zh/docs/reference/future/get-created-location.html) — 创建位置（字符串形式）
- [Future::await](/zh/docs/reference/future/await.html) — 等待结果
