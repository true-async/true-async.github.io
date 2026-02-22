---
layout: docs
lang: zh
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /zh/docs/reference/future/completed.html
page_title: "Future::completed"
description: "创建一个已完成并带有结果的 Future。"
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

创建一个已经完成的 `Future`，包含指定的值。这是一个工厂方法，返回一个立即包含结果的 `Future`。适用于从返回 `Future` 的函数中返回已知值。

## 参数

`value` — Future 将以此值完成。默认为 `null`。

## 返回值

`Future` — 一个包含指定值的已完成 Future。

## 示例

### 示例 #1 创建带有就绪值的 Future

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### 示例 #2 在返回 Future 的函数中使用

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // If data is in cache, return immediately
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Otherwise start an async operation
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## 参见

- [Future::failed](/zh/docs/reference/future/failed.html) — 创建一个带错误的 Future
- [Future::__construct](/zh/docs/reference/future/construct.html) — 通过 FutureState 创建 Future
- [Future::await](/zh/docs/reference/future/await.html) — 等待结果
