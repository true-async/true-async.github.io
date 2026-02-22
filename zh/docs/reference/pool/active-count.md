---
layout: docs
lang: zh
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /zh/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "池中活跃资源的数量。"
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

返回当前正在使用的资源数量（通过 `acquire()` 或 `tryAcquire()` 获取且尚未通过 `release()` 归还的资源）。

## 参数

该方法不接受参数。

## 返回值

活跃资源的数量。

## 示例

### 示例 #1 统计活跃资源

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

echo $pool->activeCount() . "\n"; // 0

$r1 = $pool->acquire();
$r2 = $pool->acquire();
echo $pool->activeCount() . "\n"; // 2

$pool->release($r1);
echo $pool->activeCount() . "\n"; // 1
```

### 示例 #2 显示池统计信息

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, active=%d, idle=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## 参见

- [Pool::idleCount](/zh/docs/reference/pool/idle-count.html) --- 空闲资源的数量
- [Pool::count](/zh/docs/reference/pool/count.html) --- 资源总数
