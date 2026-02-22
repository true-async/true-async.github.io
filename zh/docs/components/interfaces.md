---
layout: docs
lang: zh
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /zh/docs/components/interfaces.html
page_title: "接口"
description: "TrueAsync 基础接口 -- Awaitable、Completable、Timeout、ScopeProvider 和 SpawnStrategy。"
---

# 基础接口

## Awaitable

```php
interface Async\Awaitable {}
```

一个标记接口，用于所有可以被等待的对象。不包含任何方法 -- 仅用于类型检查。
Awaitable 对象可以多次改变状态，即它们是 `multiple-shot` 对象。

实现者：`Coroutine`、`Future`、`Channel`、`Timeout`。

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

扩展 `Awaitable`。`Async\Completable` 对象只改变一次状态（`one-shot`）。

实现者：`Coroutine`、`Future`、`Timeout`。

### cancel()

取消对象。可选的 `$cancellation` 参数允许传递特定的取消错误。

### isCompleted()

如果对象已经完成（成功或出错），返回 `true`。

### isCancelled()

如果对象已被取消，返回 `true`。

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

超时对象。通过 `timeout()` 函数创建：

```php
<?php
use function Async\timeout;
use function Async\await;

// 创建 5 秒超时
$timer = timeout(5000);

// 用作等待限制器
$result = await($coroutine, $timer);
```

`Timeout` 不能通过 `new` 创建 -- 只能通过 `timeout()`。

当超时触发时，抛出 `Async\TimeoutException`。

### 取消超时

如果不再需要超时，可以取消它：

```php
<?php
$timer = timeout(5000);

// ... 操作更快地完成了
$timer->cancel(); // 释放定时器
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

一个允许为创建协程提供 `Scope` 的接口。与 `spawn_with()` 配合使用：

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Working in the provided Scope\n";
});
?>
```

如果 `provideScope()` 返回 `null`，协程将在当前 Scope 中创建。

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

扩展 `ScopeProvider`，添加生命周期钩子 -- 允许在协程入队前后执行代码。

### beforeCoroutineEnqueue()

在协程被添加到调度器队列**之前**调用。返回一个参数数组。

### afterCoroutineEnqueue()

在协程被添加到队列**之后**调用。

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "Coroutine #{$coroutine->getId()} will be created\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Coroutine #{$coroutine->getId()} added to queue\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Executing\n";
});
?>
```

## CircuitBreaker 和 CircuitBreakerStrategy

这些接口在 [Async\Pool](/zh/docs/components/pool.html) 文档中描述。

## 另请参阅

- [协程](/zh/docs/components/coroutines.html) -- 基本并发单元
- [Scope](/zh/docs/components/scope.html) -- 管理协程生命周期
- [Future](/zh/docs/components/future.html) -- 结果承诺
- [spawn_with()](/zh/docs/reference/spawn-with.html) -- 使用提供者启动协程
