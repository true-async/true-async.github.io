---
layout: docs
lang: zh
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /zh/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "将池切换到 RECOVERING 状态。"
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

将池转换为 `RECOVERING` 状态。在此状态下，池允许有限数量的请求通过以检查服务可用性。如果请求成功，Circuit Breaker 会自动将池转换为 `ACTIVE` 状态。如果请求继续失败，池将返回 `INACTIVE` 状态。

## 参数

该方法不接受参数。

## 返回值

不返回值。

## 示例

### 示例 #1 恢复尝试

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Pool is deactivated, try to recover
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // Circuit Breaker will allow probe requests through
}
```

### 示例 #2 定期恢复尝试

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // check every 10 seconds
    }
});
```

## 参见

- [Pool::activate](/zh/docs/reference/pool/activate.html) --- 强制激活
- [Pool::deactivate](/zh/docs/reference/pool/deactivate.html) --- 强制停用
- [Pool::getState](/zh/docs/reference/pool/get-state.html) --- 当前状态
- [Pool::setCircuitBreakerStrategy](/zh/docs/reference/pool/set-circuit-breaker-strategy.html) --- 配置策略
