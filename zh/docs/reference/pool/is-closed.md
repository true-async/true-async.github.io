---
layout: docs
lang: zh
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "检查池是否已关闭。"
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

检查池是否已通过 `close()` 调用关闭。

## 参数

该方法不接受参数。

## 返回值

如果池已关闭则返回 `true`，如果池仍然活跃则返回 `false`。

## 示例

### 示例 #1 检查池状态

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### 示例 #2 有条件地使用池

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Connection pool is closed');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## 参见

- [Pool::close](/zh/docs/reference/pool/close.html) --- 关闭池
- [Pool::getState](/zh/docs/reference/pool/get-state.html) --- Circuit Breaker 状态
