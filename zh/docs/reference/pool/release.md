---
layout: docs
lang: zh
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /zh/docs/reference/pool/release.html
page_title: "Pool::release"
description: "将资源归还到池中。"
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

将之前获取的资源归还到池中。如果在创建池时设置了 `beforeRelease` 钩子，则在归还前会调用该钩子。如果钩子返回 `false`，资源将被销毁而不是归还到池中。

如果有协程正在通过 `acquire()` 等待资源，资源会立即交给第一个等待的协程。

## 参数

**resource**
: 之前通过 `acquire()` 或 `tryAcquire()` 获取的资源。

## 返回值

不返回值。

## 示例

### 示例 #1 通过 finally 安全归还

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### 示例 #2 通过 beforeRelease 自动销毁

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // If the connection is broken — do not return to the pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // If isAlive() returns false, the client will be destroyed
    $pool->release($client);
}
```

## 参见

- [Pool::acquire](/zh/docs/reference/pool/acquire.html) --- 从池中获取资源
- [Pool::tryAcquire](/zh/docs/reference/pool/try-acquire.html) --- 非阻塞获取
- [Pool::close](/zh/docs/reference/pool/close.html) --- 关闭池
