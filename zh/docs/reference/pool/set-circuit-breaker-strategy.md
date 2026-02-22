---
layout: docs
lang: zh
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /zh/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "设置池的 Circuit Breaker 策略。"
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

设置池的 Circuit Breaker 策略。Circuit Breaker 监控外部服务的可用性：在检测到多次失败后，池会自动转换为 `INACTIVE` 状态，防止错误级联。当服务恢复时，池将返回活跃状态。

## 参数

**strategy**
: 一个 `CircuitBreakerStrategy` 对象，定义状态之间的转换规则。`null` --- 禁用 Circuit Breaker。

## 返回值

不返回值。

## 示例

### 示例 #1 设置策略

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // after 5 errors — deactivate
    recoveryTimeout: 30000,    // after 30 seconds — attempt recovery
    successThreshold: 3        // 3 successful requests — full activation
);

$pool->setCircuitBreakerStrategy($strategy);
```

### 示例 #2 禁用 Circuit Breaker

```php
<?php

use Async\Pool;

// Disable the strategy
$pool->setCircuitBreakerStrategy(null);
```

## 参见

- [Pool::getState](/zh/docs/reference/pool/get-state.html) --- 当前 Circuit Breaker 状态
- [Pool::activate](/zh/docs/reference/pool/activate.html) --- 强制激活
- [Pool::deactivate](/zh/docs/reference/pool/deactivate.html) --- 强制停用
- [Pool::recover](/zh/docs/reference/pool/recover.html) --- 切换到恢复模式
