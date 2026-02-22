---
layout: docs
lang: zh
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /zh/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "获取当前的 Circuit Breaker 状态。"
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

返回池当前的 Circuit Breaker 状态。

## 参数

该方法不接受参数。

## 返回值

一个 `CircuitBreakerState` 枚举值：

- `CircuitBreakerState::ACTIVE` --- 池正常运行，正在分发资源。
- `CircuitBreakerState::INACTIVE` --- 池已停用，请求被拒绝。
- `CircuitBreakerState::RECOVERING` --- 池处于恢复模式，允许有限数量的请求通过以检查服务可用性。

## 示例

### 示例 #1 检查池状态

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool is active\n",
    CircuitBreakerState::INACTIVE => echo "Service unavailable\n",
    CircuitBreakerState::RECOVERING => echo "Recovering...\n",
};
```

### 示例 #2 基于状态的条件逻辑

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Use cached data instead of calling the service
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## 参见

- [Pool::setCircuitBreakerStrategy](/zh/docs/reference/pool/set-circuit-breaker-strategy.html) --- 设置策略
- [Pool::activate](/zh/docs/reference/pool/activate.html) --- 强制激活
- [Pool::deactivate](/zh/docs/reference/pool/deactivate.html) --- 强制停用
- [Pool::recover](/zh/docs/reference/pool/recover.html) --- 切换到恢复模式
