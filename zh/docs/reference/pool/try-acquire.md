---
layout: docs
lang: zh
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /zh/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "从池中非阻塞获取资源。"
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

尝试从池中非阻塞地获取资源。如果有可用的空闲资源或尚未达到 `max` 限制，立即返回资源。否则，返回 `null`。

## 参数

该方法不接受参数。

## 返回值

返回池中的资源，如果没有可用的空闲资源且已达到最大限制则返回 `null`。

## 示例

### 示例 #1 尝试获取资源

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "All connections are busy, try again later\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Orders: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### 示例 #2 池不可用时的降级方案

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Cache unavailable — query database directly
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## 参见

- [Pool::acquire](/zh/docs/reference/pool/acquire.html) --- 阻塞式资源获取
- [Pool::release](/zh/docs/reference/pool/release.html) --- 将资源归还到池中
