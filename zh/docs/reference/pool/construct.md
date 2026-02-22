---
layout: docs
lang: zh
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /zh/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "创建新的资源池。"
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

创建一个新的资源池。池管理一组可重用对象（连接、客户端、文件描述符等），根据需要自动创建和销毁它们。

## 参数

**factory**
: 创建新资源的工厂函数。每当池需要新资源且当前数量小于 `max` 时调用。必须返回一个可直接使用的资源。

**destructor**
: 正确销毁资源的函数。在池关闭或资源被移除时调用（例如，健康检查失败后）。`null` --- 资源直接从池中移除，不执行额外操作。

**healthcheck**
: 资源健康检查函数。接收资源，返回 `bool`。`true` --- 资源正常，`false` --- 资源将被销毁并替换。`null` --- 不执行健康检查。

**beforeAcquire**
: 在资源分发之前调用的钩子。接收资源。可用于准备资源（例如，重置状态）。`null` --- 无钩子。

**beforeRelease**
: 在资源归还到池之前调用的钩子。接收资源，返回 `bool`。如果返回 `false`，资源将被销毁而不是归还到池中。`null` --- 无钩子。

**min**
: 池中的最小资源数。创建池时，会立即创建 `min` 个资源。默认为 `0`。

**max**
: 池中的最大资源数。达到限制后，`acquire()` 调用将阻塞直到有资源被释放。默认为 `10`。

**healthcheckInterval**
: 后台资源健康检查的间隔时间（毫秒）。`0` --- 禁用后台检查（仅在获取时检查）。

## 示例

### 示例 #1 PDO 连接池

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO is closed automatically when removed
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // check every 30 seconds
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### 示例 #2 带钩子的池

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // reset to default database
    },
    beforeRelease: function(RedisClient $r): bool {
        // If the connection is broken — destroy the resource
        return $r->isConnected();
    },
    max: 5
);
```

## 参见

- [Pool::acquire](/zh/docs/reference/pool/acquire.html) --- 从池中获取资源
- [Pool::release](/zh/docs/reference/pool/release.html) --- 将资源归还到池中
- [Pool::close](/zh/docs/reference/pool/close.html) --- 关闭池
