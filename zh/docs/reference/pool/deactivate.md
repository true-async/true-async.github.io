---
layout: docs
lang: zh
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /zh/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "强制将池切换到 INACTIVE 状态。"
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

强制将池转换为 `INACTIVE` 状态。在此状态下，池会拒绝所有资源获取请求。用于在检测到外部服务问题时进行手动停用。

与 `close()` 不同，停用是可逆的 --- 池可以通过 `activate()` 或 `recover()` 恢复到工作状态。

## 参数

该方法不接受参数。

## 返回值

不返回值。

## 示例

### 示例 #1 检测到问题时停用

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Upon detecting a critical error
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### 示例 #2 计划维护

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## 参见

- [Pool::activate](/zh/docs/reference/pool/activate.html) --- 切换到 ACTIVE 状态
- [Pool::recover](/zh/docs/reference/pool/recover.html) --- 切换到 RECOVERING 状态
- [Pool::getState](/zh/docs/reference/pool/get-state.html) --- 当前状态
- [Pool::close](/zh/docs/reference/pool/close.html) --- 永久关闭池（不可逆）
