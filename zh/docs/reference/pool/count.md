---
layout: docs
lang: zh
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /zh/docs/reference/pool/count.html
page_title: "Pool::count"
description: "池中资源的总数。"
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

返回池中资源的总数，包括空闲资源和活跃（使用中）资源。

## 参数

该方法不接受参数。

## 返回值

池中资源的总数。

## 示例

### 示例 #1 监控池

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total resources: " . $pool->count() . "\n";       // 2 (min)
echo "Idle: " . $pool->idleCount() . "\n";               // 2
echo "Active: " . $pool->activeCount() . "\n";           // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // a new resource is created

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## 参见

- [Pool::idleCount](/zh/docs/reference/pool/idle-count.html) --- 空闲资源的数量
- [Pool::activeCount](/zh/docs/reference/pool/active-count.html) --- 活跃资源的数量
