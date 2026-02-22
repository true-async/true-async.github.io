---
layout: docs
lang: zh
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /zh/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "从池中获取资源（带等待）。"
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

从池中获取一个资源。如果没有可用的空闲资源且已达到最大限制，协程将阻塞直到有资源可用。

如果池中有空闲资源，将立即返回。如果没有空闲资源但尚未达到 `max` 限制，将通过 `factory` 创建新资源。否则，调用将等待资源被释放。

## 参数

**timeout**
: 最大等待时间（毫秒）。
  `0` --- 无限等待。
  如果超过超时时间，将抛出 `PoolException`。

## 返回值

返回池中的一个资源。

## 错误

在以下情况下抛出 `Async\PoolException`：
- 等待超时。
- 池已关闭。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Get a connection (waits if necessary)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### 示例 #2 带超时

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // wait no more than 5 seconds
    // work with connection...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## 参见

- [Pool::tryAcquire](/zh/docs/reference/pool/try-acquire.html) --- 非阻塞资源获取
- [Pool::release](/zh/docs/reference/pool/release.html) --- 将资源归还到池中
- [Pool::__construct](/zh/docs/reference/pool/construct.html) --- 创建池
