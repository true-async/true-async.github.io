---
layout: docs
lang: zh
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /zh/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "以字符串形式返回 Future 的完成位置。"
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

以格式化字符串的形式返回 `Future` 完成位置的信息。便于日志记录和调试。

## 返回值

`string` — 格式为 `file:line` 的字符串，例如 `/app/worker.php:15`。如果 Future 尚未完成，返回空字符串。

## 示例

### 示例 #1 获取字符串形式的完成位置

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### 示例 #2 完整的 Future 生命周期追踪

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## 参见

- [Future::getCompletedFileAndLine](/zh/docs/reference/future/get-completed-file-and-line.html) — 完成位置（数组形式）
- [Future::getCreatedLocation](/zh/docs/reference/future/get-created-location.html) — 创建位置（字符串形式）
- [Future::getAwaitingInfo](/zh/docs/reference/future/get-awaiting-info.html) — 等待者信息
