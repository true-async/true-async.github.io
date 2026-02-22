---
layout: docs
lang: zh
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /zh/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Future 完成时始终执行的回调。"
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

注册一个在 `Future` 完成时执行的回调，无论结果如何 --- 成功、错误还是取消。Future 将以与原始 Future 相同的值或错误解析。适用于释放资源。

## 参数

`finally` — 完成时执行的函数。不接受参数。签名：`function(): void`。

## 返回值

`Future` — 一个将以与原始 Future 相同的值或错误完成的新 Future。

## 示例

### 示例 #1 释放资源

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### 示例 #2 链式使用 map、catch 和 finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## 参见

- [Future::map](/zh/docs/reference/future/map.html) — 转换 Future 的结果
- [Future::catch](/zh/docs/reference/future/catch.html) — 处理 Future 的错误
- [Future::ignore](/zh/docs/reference/future/ignore.html) — 忽略未处理的错误
