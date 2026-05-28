---
layout: docs
lang: zh
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /zh/docs/components/pdo-pool.html
page_title: "PDO 连接池"
description: "PDO 连接池 -- 为协程内置的数据库连接池：透明池化、事务、自动回滚。"
---

# PDO 连接池：数据库连接池

## 问题

在使用协程时，会出现共享 I/O 描述符的问题。
如果同一个套接字被两个协程同时读写不同的数据包，数据会混乱，结果不可预测。
因此，你不能在不同的协程中简单地使用同一个 `PDO` 对象！

另一方面，为每个协程反复创建单独的连接是非常浪费的策略。
这会抵消并发 I/O 的优势。因此，与外部 API、数据库和其他资源交互时通常使用连接池。



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// 十个协程同时使用同一个 $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // 另一个协程已经在这同一个连接上调用了 COMMIT！
        $pdo->commit(); // 混乱
    });
}
```

你可以在每个协程中创建单独的连接，但如果有一千个协程就会产生一千个 TCP 连接。
MySQL 默认允许 151 个同时连接。PostgreSQL 允许 100 个。

## 解决方案：PDO 连接池

**PDO 连接池** -- 内置于 PHP 核心的数据库连接池。
它自动为每个协程从预先准备的连接集合中分配自己的连接，
并在协程完成工作后归还。

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// 十个协程 -- 每个获得自己的连接
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // 连接池自动为此协程分配连接
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // 连接归还到连接池
    });
}
```

从外部看，代码看起来就像在使用普通的 `PDO`。连接池完全透明。

## 如何启用

通过 `PDO` 构造函数属性启用连接池：

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // 启用连接池
    PDO::ATTR_POOL_MIN                  => 0,     // 最小连接数（默认 0）
    PDO::ATTR_POOL_MAX                  => 10,    // 最大连接数（默认 10）
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // 健康检查间隔（秒，0 = 禁用）
]);
```

| 属性                        | 含义                                                                 | 默认值  |
|-----------------------------|----------------------------------------------------------------------|---------|
| `POOL_ENABLED`              | 启用连接池                                                           | `false` |
| `POOL_MIN`                  | 连接池保持打开的最小连接数                                           | `0`     |
| `POOL_MAX`                  | 最大同时连接数                                                       | `10`    |
| `POOL_HEALTHCHECK_INTERVAL` | 检查连接是否存活的频率（秒）                                         | `0`     |
| `POOL_STMT_CACHE_SIZE`      | 每个物理连接上 prepared statement 的缓存大小                         | `0`（关）|

## 连接绑定到协程

每个协程从连接池获得**自己的**连接。单个协程内所有的 `query()`、`exec()`、`prepare()`
调用都通过同一个连接。

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // 三个查询都通过连接 #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // 协程结束 -- 连接 #1 归还到连接池
});

$coro2 = spawn(function() use ($pdo) {
    // 所有查询通过连接 #2
    $pdo->query("SELECT 4");
    // 协程结束 -- 连接 #2 归还到连接池
});
```

如果协程不再使用连接（没有活跃的事务或语句），
连接池可能会提前归还它 -- 无需等待协程结束。

## Prepared statement 缓存

通过创建 `PDO` 时的 `PDO::ATTR_POOL_STMT_CACHE_SIZE => N` 属性开启。连接池在
**每个物理连接**上维护一个 LRU 缓存，最多存最近 `N` 个 prepared statement。
当协程在同一连接上对相同 SQL 再次 `prepare()` 时，连接池返回已经准备好的**服务端** statement，
省掉与数据库的一次往返。

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED         => true,
    PDO::ATTR_POOL_MAX             => 10,
    PDO::ATTR_POOL_STMT_CACHE_SIZE => 64,   // 每条连接最多缓存 64 个 stmt
]);

spawn(function () use ($pdo) {
    for ($i = 0; $i < 1000; $i++) {
        // 首次：服务端真正 PREPARE。
        // 同一连接上后续调用：命中缓存，无网络流量。
        $stmt = $pdo->prepare('SELECT name FROM users WHERE id = ?');
        $stmt->execute([$i]);
        $row = $stmt->fetch();
    }
});
```

在紧密的 `prepare → execute → fetch` 循环上，这能带来 **~2.9×** 的加速（具体取决于驱动和负载）。

### 支持的驱动

`pdo_pgsql`、`pdo_mysql`、`pdo_sqlite`。

### 何时不缓存

为保证语义不变，下列情况会自动跳过缓存：

- `PDO_CURSOR_SCROLL` —— 可滚动结果的服务端游标不能复用。
- `PDO::ATTR_EMULATE_PREPARES = true` —— 模拟 prepare 不存在服务端 stmt。
- `PGSQL_ATTR_DISABLE_PREPARES` —— PG 驱动显式禁止 prepare。

### 表结构 / 计划变化时缓存失效

当表结构发生变化（`ALTER TABLE`）时，旧 stmt 的服务端计划可能不再有效。
连接池识别这类错误并**透明地重新执行**：旧 stmt 从缓存中剔除，重新 `prepare`，
用户代码**首次调用就拿到成功结果**。

| 驱动 | 触发 retry 的错误码 |
|------|---------------------|
| PostgreSQL | SQLSTATE `0A000`（feature not supported, cached plan must not change result type）、`26000`（invalid SQL statement name） |
| MySQL | `1243`（unknown prepared statement handler）、`1615`（prepared statement needs to be re-prepared）、`2057`（statement has wrong column count） |

### 该设多大

LRU 在**每个物理连接上独立**工作，所以数据库服务器上同一时间持有的 prepared stmt 数
≈ `POOL_MAX × POOL_STMT_CACHE_SIZE`。

合理范围：

- 只有几十种不同 SQL 的 web 应用 —— `16..32`；
- SQL 种类繁多的服务 —— `64..256`；
- SQL 几乎都不重复 —— 缓存无意义，留 `0`。

## 事务

事务的工作方式与普通 PDO 相同。但连接池保证
当事务处于活跃状态时，连接**绑定**到协程且不会归还到连接池。

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // 只有在 commit 之后连接才能归还到连接池
});
```

### 自动回滚

如果协程在未调用 `commit()` 的情况下结束，连接池会在将连接归还到池之前自动回滚事务。
这是防止意外数据丢失的保障。

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // 忘记了 commit()
    // 协程结束 -- 连接池将自动调用 ROLLBACK
});
```

## 连接生命周期

![连接池中的连接生命周期](/diagrams/zh/components-pdo-pool/connection-lifecycle.svg)

详细的内部调用技术图表在 [PDO 连接池架构](/zh/architecture/pdo-pool.html) 中。

## 访问连接池对象

`getPool()` 方法返回 `Async\Pool` 对象，通过它可以获取统计信息：

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool is active: " . get_class($pool) . "\n"; // Async\Pool
}
```

如果连接池未启用，`getPool()` 返回 `null`。

## 何时使用

**使用 PDO 连接池的场景：**
- 应用程序以 TrueAsync 异步模式运行
- 多个协程同时访问数据库
- 需要限制到数据库的连接数

**不需要的场景：**
- 应用程序是同步的（经典 PHP）
- 只有一个协程与数据库交互
- 使用持久连接（与连接池不兼容）

## 支持的驱动

| 驱动         | 连接池支持 |
|--------------|------------|
| `pdo_mysql`  | 是         |
| `pdo_pgsql`  | 是         |
| `pdo_sqlite` | 是         |
| `pdo_odbc`   | 否         |

## 错误处理

如果连接池无法创建连接（错误的凭据、不可用的服务器），
异常会传播到请求连接的协程：

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Failed to connect: " . $e->getMessage() . "\n";
    }
});
```

注意 `POOL_MIN => 0`：如果将最小值设置为大于零，连接池会尝试提前创建连接，
错误将在创建 PDO 对象时发生。

## 实际示例：并行订单处理

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// 获取要处理的订单列表
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // 每个协程从连接池获得自己的连接
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// 等待所有协程完成
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Order #$processedId processed\n";
}
```

十个订单并发处理，但最多通过五个数据库连接。
每个事务都是隔离的。连接在协程之间复用。

## 接下来

- [交互式 PDO 连接池演示](/zh/interactive/pdo-pool-demo.html) -- 连接池运行的可视化演示
- [PDO 连接池架构](/zh/architecture/pdo-pool.html) -- 连接池内部结构、图表、连接生命周期
- [协程](/zh/docs/components/coroutines.html) -- 协程的工作原理
- [Scope](/zh/docs/components/scope.html) -- 管理协程组
- [spawn()](/zh/docs/reference/spawn.html) -- 启动协程
- [await()](/zh/docs/reference/await.html) -- 等待结果
