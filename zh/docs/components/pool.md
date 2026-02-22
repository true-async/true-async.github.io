---
layout: docs
lang: zh
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /zh/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- 协程通用资源池：创建、获取/释放、健康检查、熔断器。"
---

# Async\Pool：通用资源池

## 为什么需要资源池

在使用协程时，会出现共享 I/O 描述符的问题。
如果同一个套接字被两个协程同时读写不同的数据包，数据会混乱，结果不可预测。
因此，你不能在不同的协程中简单地使用同一个 `PDO` 对象！

另一方面，为每个协程反复创建单独的连接是非常浪费的策略。
这会抵消并发 I/O 的优势。因此，与外部 API、数据库和其他资源交互时通常使用连接池。

资源池解决了这个问题：资源预先创建，按需分配给协程，
使用后归还以便复用。

```php
use Async\Pool;

// HTTP 连接池
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// 协程获取连接，使用后归还
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## 创建资源池

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // 如何创建资源
    destructor:         fn($r) => $r->close(),          // 如何销毁资源
    healthcheck:        fn($r) => $r->ping(),           // 资源是否存活？
    beforeAcquire:      fn($r) => $r->isValid(),        // 分配前检查
    beforeRelease:      fn($r) => !$r->isBroken(),      // 归还前检查
    min:                2,                               // 预创建 2 个资源
    max:                10,                              // 最多 10 个资源
    healthcheckInterval: 30000,                          // 每 30 秒检查一次
);
```

| 参数                   | 用途                                                           | 默认值 |
|------------------------|----------------------------------------------------------------|--------|
| `factory`              | 创建新资源。**必需**                                           | --     |
| `destructor`           | 从池中移除时销毁资源                                           | `null` |
| `healthcheck`          | 定期检查：资源是否仍然存活？                                   | `null` |
| `beforeAcquire`        | 分配前检查。`false` -- 销毁并取下一个                          | `null` |
| `beforeRelease`        | 归还前检查。`false` -- 销毁，不归还                            | `null` |
| `min`                  | 预先创建多少资源（预热）                                       | `0`    |
| `max`                  | 最大资源数（空闲 + 使用中）                                    | `10`   |
| `healthcheckInterval`  | 后台健康检查间隔（毫秒，0 = 禁用）                             | `0`    |

## 获取和释放

### 阻塞式获取

```php
// 等待直到资源可用（无限期）
$resource = $pool->acquire();

// 最多等待 5 秒
$resource = $pool->acquire(timeout: 5000);
```

如果池已满（所有资源都在使用中且已达到 `max`），协程**挂起**
并等待另一个协程归还资源。其他协程继续运行。

超时时抛出 `PoolException`。

### 非阻塞式 tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "All resources are busy, let's try later\n";
} else {
    // 使用资源
    $pool->release($resource);
}
```

如果资源不可用，`tryAcquire()` 立即返回 `null`。协程不会被挂起。

### 释放

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // 重要：始终将资源归还到池中！
    $pool->release($resource);
}
```

如果设置了 `beforeRelease` 且返回 `false`，则认为资源已损坏，
会被销毁而非归还到池中。

## 统计信息

```php
echo $pool->count();       // 总资源数（空闲 + 使用中）
echo $pool->idleCount();   // 空闲的，准备分配
echo $pool->activeCount(); // 当前正被协程使用
```

## 关闭资源池

```php
$pool->close();
```

关闭时：
- 所有等待中的协程收到 `PoolException`
- 所有空闲资源通过 `destructor` 销毁
- 使用中的资源在后续 `release` 时被销毁

## 健康检查：后台检查

如果设置了 `healthcheckInterval`，资源池会定期检查空闲资源。
失效的资源会被销毁并替换为新的（如果数量低于 `min`）。

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // 检查：连接是否存活？
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // 每 10 秒
);
```

健康检查**仅**针对空闲资源。使用中的资源不会被检查。

## 熔断器

资源池实现了 **Circuit Breaker** 模式来管理服务可用性。

### 三种状态

| 状态         | 行为                                          |
|--------------|-----------------------------------------------|
| `ACTIVE`     | 一切正常，请求正常通过                        |
| `INACTIVE`   | 服务不可用，`acquire()` 抛出异常              |
| `RECOVERING` | 测试模式，有限的请求                          |

```php
use Async\CircuitBreakerState;

// 检查状态
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// 手动控制
$pool->deactivate();  // 切换到 INACTIVE
$pool->recover();     // 切换到 RECOVERING
$pool->activate();    // 切换到 ACTIVE
```

### 通过策略自动管理

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

策略被自动调用：
- `reportSuccess()` -- 资源成功归还到池时
- `reportFailure()` -- `beforeRelease` 返回 `false` 时（资源损坏）

## 资源生命周期

![资源生命周期](/diagrams/zh/components-pool/resource-lifecycle.svg)

## 实际示例：Redis 连接池

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 个协程通过 20 个连接并发读取 Redis
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO 连接池

对于 PDO，有一个内置的 `Async\Pool` 集成，使池化完全透明。
无需手动 `acquire`/`release`，池在幕后自动管理。

了解更多：[PDO 连接池](/zh/docs/components/pdo-pool.html)

## 接下来

- [Async\Pool 架构](/zh/architecture/pool.html) -- 内部机制、图表、C API
- [PDO 连接池](/zh/docs/components/pdo-pool.html) -- PDO 的透明连接池
- [协程](/zh/docs/components/coroutines.html) -- 协程的工作原理
- [通道](/zh/docs/components/channels.html) -- 协程之间的数据交换
