---
layout: docs
lang: zh
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /zh/docs/components/exceptions.html
page_title: "异常"
description: "TrueAsync 异常层级 -- AsyncCancellation、TimeoutException、DeadlockError 等。"
---

# 异常

## 层级结构

TrueAsync 定义了针对不同类型错误的专门异常层级：

```
\Cancellation                              -- 基础取消类（与 \Error 和 \Exception 平级）
+-- Async\AsyncCancellation                -- 协程取消

\Error
+-- Async\DeadlockError                    -- 检测到死锁

\Exception
+-- Async\AsyncException                   -- 通用异步操作错误
|   +-- Async\ServiceUnavailableException  -- 服务不可用（熔断器）
+-- Async\InputOutputException             -- I/O 错误
+-- Async\DnsException                     -- DNS 解析错误
+-- Async\TimeoutException                 -- 操作超时
+-- Async\PollException                    -- 轮询操作错误
+-- Async\ChannelException                 -- 通道错误
+-- Async\PoolException                    -- 资源池错误
+-- Async\CompositeException               -- 多个异常的容器
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

当协程被取消时抛出。`\Cancellation` 是与 `\Error` 和 `\Exception` 平级的第三个根 `Throwable` 类，因此常规的 `catch (\Exception $e)` 和 `catch (\Error $e)` 块**不会**意外捕获取消异常。

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // 优雅地完成工作
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**重要：** 不要通过 `catch (\Throwable $e)` 捕获 `AsyncCancellation` 而不重新抛出 -- 这违反了协作式取消机制。

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

当调度器检测到死锁时抛出 -- 即协程相互等待、没有任何一个能继续执行的情况。

```php
<?php
use function Async\spawn;
use function Async\await;

// 经典死锁：两个协程互相等待
$c1 = spawn(function() use (&$c2) {
    await($c2); // 等待 c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // 等待 c1
});
// DeadlockError: A deadlock was detected
?>
```

协程等待自身的示例：

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // 等待自身
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

通用异步操作错误的基础异常。用于不属于专门类别的错误。

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

当超时时间超出时抛出。在 `timeout()` 触发时自动创建：

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // 长时间操作
    });
    await($coroutine, timeout(1000)); // 1 秒超时
} catch (TimeoutException $e) {
    echo "Operation didn't complete in time\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

I/O 错误的通用异常：套接字、文件、管道和其他 I/O 描述符。

## DnsException

```php
class Async\DnsException extends \Exception {}
```

DNS 解析错误时抛出（`gethostbyname`、`gethostbyaddr`、`gethostbynamel`）。

## PollException

```php
class Async\PollException extends \Exception {}
```

描述符上的轮询操作错误时抛出。

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

当熔断器处于 `INACTIVE` 状态且服务请求未经执行尝试即被拒绝时抛出。

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Service is temporarily unavailable\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

通道操作错误时抛出：向已关闭的通道发送、从已关闭的通道接收等。

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

资源池操作错误时抛出。

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

多个异常的容器。当多个处理器（例如 Scope 中的 `finally`）在完成时抛出异常时使用：

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Cleanup error 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Cleanup error 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errors: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errors: 2
//   - Cleanup error 1
//   - Cleanup error 2
?>
```

## 建议

### 正确处理 AsyncCancellation

```php
<?php
// 正确：捕获特定异常
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation 不会被捕获 -- 它是 \Cancellation
    handleError($e);
}
```

```php
<?php
// 如果需要捕获所有异常 -- 始终重新抛出 AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // 重新抛出
} catch (\Throwable $e) {
    handleError($e);
}
```

### 保护临界区

使用 `protect()` 处理不能被取消中断的操作：

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## 另请参阅

- [取消机制](/zh/docs/components/cancellation.html) -- 协程取消机制
- [protect()](/zh/docs/reference/protect.html) -- 防止取消的保护
- [Scope](/zh/docs/components/scope.html) -- 作用域中的异常处理
