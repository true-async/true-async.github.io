---
layout: docs
lang: zh
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /zh/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "强制将池切换到 ACTIVE 状态。"
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

强制将池转换为 `ACTIVE` 状态。资源重新可供获取。用于手动管理 Circuit Breaker，例如在确认服务已恢复之后。

## 参数

该方法不接受参数。

## 返回值

不返回值。

## 示例

### 示例 #1 验证后手动激活

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Suppose the pool was deactivated
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Manually check service availability
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### 示例 #2 通过外部信号激活

```php
<?php

use Async\Pool;

// Webhook handler from the monitoring system
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## 参见

- [Pool::deactivate](/zh/docs/reference/pool/deactivate.html) --- 切换到 INACTIVE 状态
- [Pool::recover](/zh/docs/reference/pool/recover.html) --- 切换到 RECOVERING 状态
- [Pool::getState](/zh/docs/reference/pool/get-state.html) --- 当前状态
