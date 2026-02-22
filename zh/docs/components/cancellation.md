---
layout: docs
lang: zh
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /zh/docs/components/cancellation.html
page_title: "取消机制"
description: "TrueAsync 中的协程取消 -- 协作式取消、protect() 临界区、通过 Scope 进行级联取消、超时。"
---

# 取消机制

浏览器发送了请求，但用户关闭了页面。
服务器继续处理一个不再需要的请求。
最好能中止操作以避免不必要的开销。
又或者有一个长时间运行的数据复制过程需要突然取消。
需要停止操作的场景有很多。
通常这个问题通过标志变量或取消令牌来解决，这相当繁琐。代码必须知道
它可能被取消，必须规划取消检查点，并正确处理这些情况。

## 设计即可取消

大多数情况下，应用程序都在忙于从数据库、文件或网络读取数据。中断读取操作是安全的。
因此，在 `TrueAsync` 中遵循以下原则：**协程可以在等待状态的任何时刻被取消**。
这种方式减少了代码量，因为在大多数情况下，程序员不需要担心取消问题。

## 取消的工作原理

使用一个特殊的异常 -- `Cancellation` -- 来取消协程。
`Cancellation` 异常或其派生异常会在挂起点（`suspend()`、`await()`、`delay()`）被抛出。
执行也可以在 I/O 操作或任何其他阻塞操作期间被中断。

```php
$coroutine = spawn(function() {
    echo "Starting work\n";
    suspend(); // 协程将在此处收到 Cancellation
    echo "This won't happen\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancelled\n";
    throw $e;
}
```

## 取消不能被抑制

`Cancellation` 是一个基础级别的异常，与 `Error` 和 `Exception` 平级。
`catch (Exception $e)` 结构不会捕获它。

捕获 `Cancellation` 并继续工作是一个错误。
你可以使用 `catch Async\AsyncCancellation` 来处理特殊情况，
但必须确保正确地重新抛出异常。
通常，建议使用 `finally` 来保证资源清理：

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## 三种取消场景

`cancel()` 的行为取决于协程的状态：

**协程尚未启动** -- 它将永远不会启动。

```php
$coroutine = spawn(function() {
    echo "Won't execute\n";
});
$coroutine->cancel();
```

**协程处于等待状态** -- 它将带着 `Cancellation` 异常被唤醒。

```php
$coroutine = spawn(function() {
    echo "Started work\n";
    suspend(); // 将在此处收到 Cancellation
    echo "Won't execute\n";
});

suspend();
$coroutine->cancel();
```

**协程已经完成** -- 什么也不会发生。

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // 不是错误，但没有效果
```

## 临界区：protect()

并非每个操作都能安全地被中断。
如果协程已经从一个账户扣了款但尚未给另一个账户打款 --
此时取消将导致数据丢失。

`protect()` 函数将取消推迟到临界区完成之后：

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // 取消将在此处生效 -- 在退出 protect() 之后
});

suspend();
$coroutine->cancel();
```

在 `protect()` 内部，协程被标记为受保护状态。
如果此时 `cancel()` 到达，取消会被保存但不会被应用。一旦 `protect()` 完成 --
延迟的取消立即生效。

## 通过 Scope 进行级联取消

当一个 `Scope` 被取消时，它的所有协程和所有子作用域都会被取消。
级联**只向下传播** -- 取消子作用域不会影响父作用域或兄弟作用域。

### 隔离性：取消子级不影响其他

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// 只取消 child1
$child1->cancel();

$parent->isCancelled(); // false -- 父级不受影响
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- 兄弟作用域不受影响
```

### 向下级联：取消父级将取消所有后代

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // 级联：同时取消 child1 和 child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### 协程可以取消自己所在的 Scope

协程可以发起取消它所运行的作用域。在最近的挂起点之前的代码将继续执行：

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Starting\n";
    $scope->cancel();
    echo "This will still execute\n";
    suspend();
    echo "But this won't\n";
});
```

取消后，作用域被关闭 -- 不再可能在其中启动新协程。

## 超时

取消的一个特殊情况是超时。`timeout()` 函数创建一个时间限制：

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "API didn't respond within 5 seconds\n";
}
```

`TimeoutException` 是 `Cancellation` 的子类型，
因此协程按照相同的规则终止。

## 检查状态

协程提供两个方法来检查取消状态：

- `isCancellationRequested()` -- 取消已被请求但尚未应用
- `isCancelled()` -- 协程已实际停止

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- 尚未处理

suspend();

$coroutine->isCancelled();             // true
```

## 示例：带优雅关闭的队列工作者

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // 所有协程将在此处被停止
        $this->scope->cancel();
    }
}
```

## 接下来

- [Scope](/zh/docs/components/scope.html) -- 管理协程组
- [协程](/zh/docs/components/coroutines.html) -- 协程生命周期
- [通道](/zh/docs/components/channels.html) -- 协程之间的数据交换
