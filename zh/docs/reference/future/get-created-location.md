---
layout: docs
lang: zh
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /zh/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "以字符串形式返回 Future 的创建位置。"
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

以格式化字符串的形式返回 `Future` 创建位置的信息。便于日志记录和调试输出。

## 返回值

`string` — 格式为 `file:line` 的字符串，例如 `/app/script.php:42`。

## 示例

### 示例 #1 获取字符串形式的创建位置

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### 示例 #2 在调试消息中使用

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Debug long-running Futures
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## 参见

- [Future::getCreatedFileAndLine](/zh/docs/reference/future/get-created-file-and-line.html) — 创建位置（数组形式）
- [Future::getCompletedLocation](/zh/docs/reference/future/get-completed-location.html) — 完成位置（字符串形式）
- [Future::getAwaitingInfo](/zh/docs/reference/future/get-awaiting-info.html) — 等待者信息
