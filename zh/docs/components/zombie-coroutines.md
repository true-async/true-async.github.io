---
layout: docs
lang: zh
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /zh/docs/components/zombie-coroutines.html
page_title: "僵尸协程"
description: "TrueAsync 中的僵尸协程 -- 对第三方代码的容错、disposeSafely()、disposeAfterTimeout()、管理不可取消的任务。"
---

# 僵尸协程：容错性

## 问题：无法取消的代码

协程取消是一个协作过程。协程在挂起点接收 `Cancellation` 异常
并必须优雅地终止。但如果有人犯了错误，在错误的 `Scope` 中创建了协程怎么办？
虽然 `TrueAsync` 遵循 `Cancellation by design` 原则，但可能出现有人编写的代码
如果被取消会导致不愉快结果的情况。
例如，有人创建了一个发送 `email` 的后台任务。协程被取消了，`email` 永远没有发送。

高容错性允许在开发时间上大幅节省，
如果程序员通过日志分析来改进应用质量，还能最小化错误的后果。

## 解决方案：僵尸协程

为了缓解这类情况，`TrueAsync` 提供了一种特殊的方式：
对"卡住"的协程进行容错处理 -- 僵尸协程。

`zombie`（僵尸）协程是指：
* 继续正常执行
* 仍然绑定到其 Scope
* 不被视为活跃 -- Scope 可以在不等待它的情况下正式完成
* 不阻塞 `awaitCompletion()`，但阻塞 `awaitAfterCancellation()`

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // 第三方代码 -- 我们不知道它如何响应取消
});

$scope->spawn(function() {
    return myOwnCode(); // 我们的代码 -- 正确处理取消
});

// disposeSafely() 不取消协程，而是将它们标记为僵尸
$scope->disposeSafely();
// Scope 对新协程关闭。
// 现有协程作为僵尸继续工作。
```

## Scope 终止的三种策略

`TrueAsync` 提供三种关闭 `Scope` 的方式，针对对代码的不同信任级别设计：

### `dispose()` -- 强制取消

所有协程接收 `Cancellation`。Scope 立即关闭。
当你控制 Scope 内所有代码时使用。

```php
$scope->dispose();
// 所有协程被取消。Scope 被关闭。
```

### `disposeSafely()` -- 不取消，协程变成僵尸

协程**不接收** `Cancellation`。它们被标记为 `zombie` 并继续运行。
`Scope` 被视为已关闭 -- 无法创建新协程。

当 `Scope` 包含"第三方"代码且你不确定取消是否正确时使用。

```php
$scope->disposeSafely();
// 协程作为僵尸继续工作。
// Scope 对新任务关闭。
```

### `disposeAfterTimeout(int $timeout)` -- 带超时的取消

两种方式的组合：首先给协程时间完成，
然后强制取消 `Scope`。

```php
$scope->disposeAfterTimeout(5000);
// 5 秒后，Scope 将向所有剩余协程发送 Cancellation。
```

## 等待僵尸协程

`awaitCompletion()` 仅等待**活跃**协程。一旦所有协程变成僵尸，
`awaitCompletion()` 认为 Scope 已完成并返回控制权。

但有时你需要等待**所有**协程完成，包括僵尸。
为此存在 `awaitAfterCancellation()`：

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// 取消 -- 无法被取消的协程将变成僵尸
$scope->cancel();

// awaitCompletion() 如果只剩僵尸将立即返回
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() 将等待所有协程，包括僵尸
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // 僵尸协程的错误处理器
    echo "Zombie error: " . $error->getMessage() . "\n";
});
```

| 方法                         | 等待活跃协程 | 等待僵尸协程 | 需要 cancel() |
|------------------------------|:------------:|:------------:|:--------------:|
| `awaitCompletion()`          |      是      |      否      |       否       |
| `awaitAfterCancellation()`   |      是      |      是      |       是       |

`awaitAfterCancellation()` 只能在 `cancel()` 之后调用 -- 否则会出错。
这是合理的：僵尸协程正是由于带有 `DISPOSE_SAFELY` 标志的取消而出现的。

## 僵尸的内部工作机制

当协程被标记为 `zombie` 时，会发生以下情况：

1. 协程接收 `ZOMBIE` 标志
2. `Scope` 中的活跃协程计数器减 1
3. `zombie` 协程计数器加 1
4. `Scope` 检查是否还有活跃协程，并可以通知等待者完成

```
Scope
+-- active_coroutines_count: 0    <-- 减少
+-- zombie_coroutines_count: 2    <-- 增加
+-- coroutine A (zombie)          <-- 继续运行
+-- coroutine B (zombie)          <-- 继续运行
```

`zombie` 协程**没有**从 `Scope` 中分离。它仍在协程列表中，
但不被计为活跃。当 `zombie` 协程最终完成时，
它会从 `Scope` 中移除，`Scope` 检查是否可以完全释放资源。

## 调度器如何处理僵尸

`Scheduler` 维护两个独立的协程计数：

1. **全局活跃协程计数器**（`active_coroutine_count`）-- 用于快速检查
   是否有需要调度的工作
2. **协程注册表**（`coroutines` 哈希表）-- 包含**所有**仍在运行的协程，
   包括 `zombies`

当协程被标记为 `zombie` 时：
* 全局活跃协程计数器**减少** -- 调度器认为活跃工作减少了
* 协程**保留**在注册表中 -- `Scheduler` 继续管理它的执行

应用程序在活跃协程计数器大于零时继续运行。一个重要的结论：
`Zombie` 协程不会阻止应用程序关闭，因为它们不被视为活跃的。
如果没有更多活跃协程，应用程序终止，即使 `zombie` 协程也会被取消。

## 继承 Safely 标志

默认情况下，`Scope` 使用 `DISPOSE_SAFELY` 标志创建。
这意味着：如果 `Scope` 被销毁（例如在对象的析构函数中），
协程变成 `zombies` 而不是被取消。

子 `Scope` 从父级继承此标志：

```php
$parent = new Async\Scope();
// parent 默认有 DISPOSE_SAFELY 标志

$child = Async\Scope::inherit($parent);
// child 也有 DISPOSE_SAFELY 标志
```

如果你想在销毁时强制取消，使用 `asNotSafely()`：

```php
$scope = (new Async\Scope())->asNotSafely();
// 现在当 Scope 对象被销毁时，
// 协程将被强制取消而不是标记为僵尸
```

## 示例：带中间件的 HTTP 服务器

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // 启动中间件 -- 这可能是第三方代码
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // 主处理 -- 我们的代码
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // 销毁时：中间件可能不适合取消，
        // 所以我们使用 disposeSafely()（默认行为）。
        // 僵尸协程会自行完成。
        $this->scope->disposeSafely();
    }
}
```

## 示例：带时间限制的处理器

```php
$scope = new Async\Scope();

// 启动包含第三方代码的任务
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// 给 10 秒完成，然后强制取消
$scope->disposeAfterTimeout(10000);
```

## 当僵尸成为问题时

`Zombie` 协程是一种折中方案。它们解决了第三方代码的问题，
但可能导致资源泄漏。

因此，`disposeAfterTimeout()` 或带显式协程取消的 `Scope` 是生产环境的最佳选择：
它给第三方代码完成的时间，但在挂起时保证取消。

## 总结

| 方法                      | 取消协程 | 协程完成           | Scope 关闭 |
|---------------------------|:--------:|:------------------:|:----------:|
| `dispose()`               |    是    |         否         |     是     |
| `disposeSafely()`         |    否    |  是（作为僵尸）    |     是     |
| `disposeAfterTimeout(ms)` | 超时后   |  直到超时          |     是     |

## 记录僵尸协程

在未来的版本中，`TrueAsync` 计划提供记录僵尸协程的机制，
这将帮助开发者排查与卡住任务相关的问题。

## 接下来

- [Scope](/zh/docs/components/scope.html) -- 管理协程组
- [取消机制](/zh/docs/components/cancellation.html) -- 取消模式
- [协程](/zh/docs/components/coroutines.html) -- 协程生命周期
