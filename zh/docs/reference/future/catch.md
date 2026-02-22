---
layout: docs
lang: zh
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /zh/docs/reference/future/catch.html
page_title: "Future::catch"
description: "处理 Future 的错误。"
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

为 `Future` 注册一个错误处理器。如果 Future 以异常完成，则调用该回调函数。如果回调返回一个值，该值将成为新 Future 的结果。如果回调抛出异常，新 Future 将以该错误完成。

## 参数

`catch` — 错误处理函数。接收一个 `Throwable`，可以返回一个值用于恢复。签名：`function(\Throwable $e): mixed`。

## 返回值

`Future` — 一个包含错误处理结果的新 Future，如果没有错误则包含原始值。

## 示例

### 示例 #1 带恢复的错误处理

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recovery
    });

$result = $future->await();
echo $result; // default value
```

### 示例 #2 在异步操作中捕获错误

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Log the error and return an empty array
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## 参见

- [Future::map](/zh/docs/reference/future/map.html) — 转换 Future 的结果
- [Future::finally](/zh/docs/reference/future/finally.html) — Future 完成时的回调
- [Future::ignore](/zh/docs/reference/future/ignore.html) — 忽略未处理的错误
