---
layout: docs
lang: zh
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /zh/docs/components/scope.html
page_title: "Scope"
description: "TrueAsync 中的 Scope -- 管理协程生命周期、层级结构、组取消、错误处理和结构化并发。"
---

# Scope：管理协程生命周期

## 问题：显式资源控制与被遗忘的协程

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// 函数返回了，但三个协程仍在运行！
// 谁在监控它们？它们何时完成？
// 如果发生异常，谁来处理？
```

异步编程中常见的问题之一是开发者意外"遗忘"的协程。
它们被启动，执行工作，但没有人监控它们的生命周期。
这可能导致资源泄漏、未完成的操作和难以发现的 bug。
对于`有状态`应用程序来说，这个问题尤为重要。

## 解决方案：Scope

![Scope 概念](../../../assets/docs/scope_concept.jpg)

**Scope** -- 运行协程的逻辑空间，可以比作一个沙箱。

以下规则保证协程处于受控状态：
* 代码总是知道它在哪个 `Scope` 中执行
* `spawn()` 函数在当前 `Scope` 中创建协程
* `Scope` 了解所有属于它的协程

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // 等待作用域中所有协程完成
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// 现在函数只有在所有协程完成后才会返回
```

## 绑定到对象

`Scope` 适合绑定到对象以显式表达协程组的所有权。
这种语义直接表达了程序员的意图。

```php
class UserService
{
    // 只有一个唯一对象拥有唯一的 Scope
    // 协程的生命与 UserService 对象相同
    private Scope $scope;

    public function __construct() {
        // 为所有服务协程创建一个穹顶
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // 在我们的穹顶内启动协程
        $this->scope->spawn(function() use ($userId) {
            // 此协程绑定到 UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // 当对象被删除时，保证资源清理
        // 内部所有协程自动被取消
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// 删除服务 - 其所有协程自动被取消
unset($service);
```

## Scope 层级

一个作用域可以包含其他作用域。当父作用域被取消时，
所有子作用域及其协程也会被取消。

这种方式称为**结构化并发**。

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Main task\n";

    // 创建子作用域
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Subtask 1\n";
    });

    $childScope->spawn(function() {
        echo "Subtask 2\n";
    });

    // 等待子任务完成
    $childScope->awaitCompletion();

    echo "All subtasks done\n";
});

$mainScope->awaitCompletion();
```

如果你取消 `$mainScope`，所有子作用域也会被取消。整个层级。

## 取消 Scope 中的所有协程

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Also working...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Me too!\n";
    }
});

// 工作 3 秒
Async\sleep(3000);

// 取消 scope 中的所有协程
$scope->cancel();

// 两个协程都会收到 AsyncCancellation
```

## Scope 中的错误处理

当作用域内的协程出错时，作用域可以捕获它：

```php
$scope = new Async\Scope();

// 设置错误处理器
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Error in scope: " . $e->getMessage() . "\n";
    // 可以记录日志、发送到 Sentry 等
});

$scope->spawn(function() {
    throw new Exception("Something broke!");
});

$scope->spawn(function() {
    echo "I'm working fine\n";
});

$scope->awaitCompletion();

// 输出：
// Error in scope: Something broke!
// I'm working fine
```

## Finally：保证清理

即使作用域被取消，finally 块也会执行：

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Starting work\n";
        Async\sleep(10000); // 长时间操作
        echo "Finished\n"; // 不会执行
    } finally {
        // 这是保证执行的
        echo "Cleaning up resources\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // 1 秒后取消

// 输出：
// Starting work
// Cleaning up resources
```

## TaskGroup：带结果的 Scope

`TaskGroup` -- 用于并行任务执行并聚合结果的专用作用域。它支持并发限制、
命名任务和三种等待策略：

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// 获取所有结果（等待所有任务完成）
$results = await($group->all());

// 或获取第一个完成的结果
$first = await($group->race());

// 或第一个成功的（忽略错误）
$any = await($group->any());
```

可以用键添加任务并在完成时迭代：

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// 按结果就绪顺序迭代
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Task $key failed: {$error->getMessage()}\n";
    } else {
        echo "Task $key: $result\n";
    }
}
```

## 全局 Scope：总有一个父级

如果你没有显式指定作用域，协程会在**全局作用域**中创建：

```php
// 不指定作用域
spawn(function() {
    echo "I'm in global scope\n";
});

// 等同于：
Async\Scope::global()->spawn(function() {
    echo "I'm in global scope\n";
});
```

全局作用域存在于整个请求期间。当 PHP 退出时，全局作用域中的所有协程会被优雅取消。

## 实际示例：HTTP 客户端

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // 取消所有活跃请求
        $this->scope->cancel();
    }

    public function __destruct() {
        // 当客户端被销毁时，所有请求自动取消
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// 取消所有请求
$client->cancelAll();

// 或直接销毁客户端 - 效果相同
unset($client);
```

## 结构化并发

`Scope` 实现了**结构化并发**原则 --
一套经过 `Kotlin`、`Swift` 和 `Java` 生产运行时验证的并发任务管理规则。

### 生命周期管理 API

`Scope` 提供了使用以下方法显式控制协程层级生命周期的能力：

| 方法                                     | 功能                                                             |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | 在 Scope 内启动协程                                             |
| `$scope->awaitCompletion($cancellation)` | 等待 Scope 中所有协程完成                                       |
| `$scope->cancel()`                       | 向所有协程发送取消信号                                           |
| `$scope->dispose()`                      | 关闭 Scope 并强制取消所有协程                                   |
| `$scope->disposeSafely()`               | 关闭 Scope；协程不被取消但标记为僵尸                             |
| `$scope->awaitAfterCancellation()`       | 等待所有协程完成，包括僵尸协程                                   |
| `$scope->disposeAfterTimeout(int $ms)`   | 超时后取消协程                                                   |

这些方法允许实现三个关键模式：

**1. 父级等待所有子任务**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* 任务 1 */ });
$scope->spawn(function() { /* 任务 2 */ });

// 两个任务都完成前不会返回控制权
$scope->awaitCompletion();
```

在 Kotlin 中，同样的操作通过 `coroutineScope { }` 实现，
在 Swift 中通过 `withTaskGroup { }` 实现。

**2. 父级取消所有子任务**

```php
$scope->cancel();
// $scope 中的所有协程将收到取消信号。
// 子 Scope 也会被取消 -- 递归到任何深度。
```

**3. 父级关闭 Scope 并释放资源**

`dispose()` 关闭 Scope 并强制取消所有协程：

```php
$scope->dispose();
// Scope 被关闭。所有协程被取消。
// 不能再向此 Scope 添加新协程。
```

如果需要关闭 Scope 但允许当前协程**完成工作**，
使用 `disposeSafely()` -- 协程被标记为僵尸
（不被取消，继续执行，但 Scope 认为活跃任务已完成）：

```php
$scope->disposeSafely();
// Scope 被关闭。协程作为僵尸继续工作。
// Scope 跟踪它们但不将其计为活跃的。
```

### 错误处理：两种策略

协程中未处理的异常不会丢失 -- 它会冒泡到父 Scope。
不同的运行时提供不同的策略：

| 策略                                                             | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **共同失败**：一个子级的错误取消所有其他                          | `coroutineScope`  | `withThrowingTaskGroup` | `Scope`（默认）                    |
| **独立子级**：一个的错误不影响其他                                | `supervisorScope` | 单独的 `Task`           | `$scope->setExceptionHandler(...)` |

选择策略的能力是与"发后即忘"的关键区别。

### 上下文继承

子任务自动接收父级的上下文：
优先级、截止时间、元数据 -- 无需显式传递参数。

在 Kotlin 中，子协程继承父级的 `CoroutineContext`（调度器、名称、`Job`）。
在 Swift 中，子 `Task` 实例继承优先级和任务本地值。

### 在哪些地方已经投入使用

| 语言       | API                                                             | 生产使用始于 |
|------------|-----------------------------------------------------------------|-------------|
| **Kotlin** | `coroutineScope`、`supervisorScope`                             | 2018        |
| **Swift**  | `TaskGroup`、`withThrowingTaskGroup`                            | 2021        |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023（预览）|

TrueAsync 通过 `Async\Scope` 将这种方式带入 PHP。

## 接下来

- [协程](/zh/docs/components/coroutines.html) -- 协程的工作原理
- [取消机制](/zh/docs/components/cancellation.html) -- 取消模式
- [僵尸协程](/zh/docs/components/zombie-coroutines.html) -- 对第三方代码的容错
