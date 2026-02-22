---
layout: docs
lang: zh
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /zh/docs/reference/future/failed.html
page_title: "Future::failed"
description: "创建一个以错误完成的 Future。"
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

创建一个立即以指定错误完成的 `Future`。对这样的 Future 调用 `await()` 将抛出所提供的异常。

## 参数

`throwable` — Future 将以此异常完成。

## 返回值

`Future` — 一个以错误完成的 Future。

## 示例

### 示例 #1 创建带错误的 Future

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### 示例 #2 用于提前返回错误

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## 参见

- [Future::completed](/zh/docs/reference/future/completed.html) — 创建一个带结果的 Future
- [Future::catch](/zh/docs/reference/future/catch.html) — 处理 Future 的错误
- [Future::await](/zh/docs/reference/future/await.html) — 等待结果
