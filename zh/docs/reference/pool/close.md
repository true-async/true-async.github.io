---
layout: docs
lang: zh
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /zh/docs/reference/pool/close.html
page_title: "Pool::close"
description: "关闭池并销毁所有资源。"
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

关闭资源池。所有空闲资源通过 `destructor`（如果提供了的话）进行销毁。所有通过 `acquire()` 等待资源的协程将收到 `PoolException`。关闭后，任何对 `acquire()` 和 `tryAcquire()` 的调用都会抛出异常。

## 参数

该方法不接受参数。

## 返回值

不返回值。

## 示例

### 示例 #1 优雅关闭

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Close all prepared statements and connection
    },
    min: 2,
    max: 10
);

// ... work with the pool ...

// Close the pool when the application shuts down
$pool->close();
```

### 示例 #2 等待中的协程会收到异常

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // took the only resource

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // waiting for release
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // waiting coroutine will receive PoolException
```

## 参见

- [Pool::isClosed](/zh/docs/reference/pool/is-closed.html) --- 检查池是否已关闭
- [Pool::__construct](/zh/docs/reference/pool/construct.html) --- 创建池
