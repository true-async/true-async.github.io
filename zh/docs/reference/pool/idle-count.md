---
layout: docs
lang: zh
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /zh/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "池中空闲资源的数量。"
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

返回空闲（未使用）且可供获取的资源数量。

## 参数

该方法不接受参数。

## 返回值

池中空闲资源的数量。

## 示例

### 示例 #1 跟踪空闲资源

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 3,
    max: 10
);

echo $pool->idleCount() . "\n"; // 3

$conn = $pool->acquire();
echo $pool->idleCount() . "\n"; // 2

$pool->release($conn);
echo $pool->idleCount() . "\n"; // 3
```

### 示例 #2 自适应策略

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// If few idle resources remain — reduce load
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## 参见

- [Pool::activeCount](/zh/docs/reference/pool/active-count.html) --- 活跃资源的数量
- [Pool::count](/zh/docs/reference/pool/count.html) --- 资源总数
