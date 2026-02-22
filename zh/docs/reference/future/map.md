---
layout: docs
lang: zh
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /zh/docs/reference/future/map.html
page_title: "Future::map"
description: "转换 Future 的结果。"
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

使用回调函数转换 `Future` 的结果。回调接收已完成 Future 的值并返回新值。类似于基于 Promise 的 API 中的 `then()`。如果原始 Future 以错误完成，回调不会被调用，错误会传递到新 Future。

## 参数

`map` — 转换函数。接收 Future 的结果，返回新值。签名：`function(mixed $value): mixed`。

## 返回值

`Future` — 一个包含转换后结果的新 Future。

## 示例

### 示例 #1 转换结果

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### 示例 #2 异步加载的转换链

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## 参见

- [Future::catch](/zh/docs/reference/future/catch.html) — 处理 Future 的错误
- [Future::finally](/zh/docs/reference/future/finally.html) — Future 完成时的回调
- [Future::await](/zh/docs/reference/future/await.html) — 等待结果
