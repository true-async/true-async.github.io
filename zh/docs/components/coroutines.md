---
layout: docs
lang: zh
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /zh/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "Async\\Coroutine 类 -- 创建、生命周期、状态、取消、调试及完整方法参考。"
---

# Async\Coroutine 类

(PHP 8.6+, True Async 1.0)

## TrueAsync 中的协程

当普通函数调用 `fread` 或 `fwrite` 等 I/O 操作（读取文件或发起网络请求）时，
控制权被传递给操作系统内核，`PHP` 会阻塞直到操作完成。

但如果函数在协程内部执行并调用 I/O 操作，
则只有该协程被阻塞，而不是整个 `PHP` 进程。
同时，控制权被传递给另一个协程（如果存在的话）。

从这个意义上说，协程与操作系统线程非常相似，
但它们是在用户空间而非由操作系统内核管理的。

另一个重要区别是，协程通过轮流执行来共享 CPU 时间，
自愿让出控制权，而线程可以在任何时刻被抢占。

TrueAsync 协程在单线程内执行，
并且不是并行的。这带来了几个重要的结论：
- 变量可以在不同协程之间自由读取和修改而无需加锁，因为它们不会同时执行。
- 协程不能同时使用多个 CPU 核心。
- 如果一个协程执行了长时间的同步操作，它会阻塞整个进程，因为它不会将控制权让给其他协程。

## 创建协程

使用 `spawn()` 函数创建协程：

```php
use function Async\spawn;

// 创建协程
$coroutine = spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

// $coroutine 是 Async\Coroutine 类型的对象
// 协程已被调度等待执行
```

调用 `spawn` 后，函数将由调度器尽快异步执行。

## 传递参数

`spawn` 函数接受一个 `callable` 和任何将在启动时传递给该函数的参数。

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// 传递函数和参数
$coroutine = spawn(fetchUser(...), 123);
```

## 获取结果

要获取协程的结果，使用 `await()`：

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Done!";
});

echo "Coroutine started\n";

// 等待结果
$result = await($coroutine);

echo "Result: $result\n";
```

**重要：** `await()` 阻塞的是**当前协程**的执行，而不是整个 `PHP` 进程。
其他协程继续运行。

## 协程生命周期

协程经历以下几个状态：

1. **排队中** -- 通过 `spawn()` 创建，等待调度器启动
2. **运行中** -- 当前正在执行
3. **挂起中** -- 暂停，等待 I/O 或 `suspend()`
4. **已完成** -- 执行结束（有结果或异常）
5. **已取消** -- 通过 `cancel()` 取消

### 检查状态

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - 等待启动
var_dump($coro->isStarted());   // false - 尚未启动

suspend(); // 让协程启动

var_dump($coro->isStarted());    // true - 协程已启动
var_dump($coro->isRunning());    // false - 当前未在执行
var_dump($coro->isSuspended());  // true - 已挂起，等待某事
var_dump($coro->isCompleted());  // false - 尚未完成
var_dump($coro->isCancelled());  // false - 未被取消
```

## 挂起：suspend

`suspend` 关键字停止协程并将控制权传递给调度器：

```php
spawn(function() {
    echo "Before suspend\n";

    suspend(); // 我们在这里停下来

    echo "After suspend\n";
});

echo "Main code\n";

// 输出：
// Before suspend
// Main code
// After suspend
```

协程在 `suspend` 处停止，控制权返回到主代码。随后，调度器恢复了协程。

### 带等待的 suspend

通常 `suspend` 用于等待某个事件：

```php
spawn(function() {
    echo "Making an HTTP request\n";

    $data = file_get_contents('https://api.example.com/data');
    // 在 file_get_contents 内部，隐式调用了 suspend
    // 当网络请求正在进行时，协程被挂起

    echo "Got data: $data\n";
});
```

PHP 在 I/O 操作时自动挂起协程。你不需要手动编写 `suspend`。

## 取消协程

```php
$coro = spawn(function() {
    try {
        echo "Starting long work\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // 休眠 100 毫秒
            echo "Iteration $i\n";
        }

        echo "Finished\n";
    } catch (Async\AsyncCancellation $e) {
        echo "I was cancelled during iteration\n";
    }
});

// 让协程工作 1 秒
Async\sleep(1000);

// 取消它
$coro->cancel();

// 协程将在下一个 await/suspend 处收到 AsyncCancellation
```

**重要：** 取消是协作式的。协程必须检查取消状态（通过 `await`、`sleep` 或 `suspend`）。你不能强制终止一个协程。

## 多个协程

想启动多少就启动多少：

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// 等待所有协程
$results = array_map(fn($t) => await($t), $tasks);

echo "Loaded " . count($results) . " results\n";
```

所有 10 个请求并发运行。不再需要 10 秒（每个一秒），而是大约 1 秒完成。

## 错误处理

协程中的错误使用常规的 `try-catch` 处理：

```php
$coro = spawn(function() {
    throw new Exception("Oops!");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Caught error: " . $e->getMessage() . "\n";
}
```

如果错误未被捕获，它会冒泡到父作用域：

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Error in coroutine!");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "Error bubbled up to scope: " . $e->getMessage() . "\n";
}
```

## 协程 = 对象

协程是一个完整的 PHP 对象。你可以将它传递到任何地方：

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // 长时间工作
        Async\sleep(10000);
        return "Result";
    });
}

$task = startBackgroundTask();

// 传递给另一个函数
processTask($task);

// 或存储在数组中
$tasks[] = $task;

// 或存储在对象属性中
$this->backgroundTask = $task;
```

## 嵌套协程

协程可以启动其他协程：

```php
spawn(function() {
    echo "Parent coroutine\n";

    $child1 = spawn(function() {
        echo "Child coroutine 1\n";
        return "Result 1";
    });

    $child2 = spawn(function() {
        echo "Child coroutine 2\n";
        return "Result 2";
    });

    // 等待两个子协程
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Parent received: $result1 and $result2\n";
});
```

## Finally：保证清理

即使协程被取消，`finally` 也会执行：

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // 可能在此处被取消
        }
    } finally {
        // 无论如何文件都会被关闭
        fclose($file);
        echo "File closed\n";
    }
});
```

## 调试协程

### 获取调用栈

```php
$coro = spawn(function() {
    doSomething();
});

// 获取协程的调用栈
$trace = $coro->getTrace();
print_r($trace);
```

### 查看协程创建位置

```php
$coro = spawn(someFunction(...));

// spawn() 被调用的位置
echo "Coroutine created at: " . $coro->getSpawnLocation() . "\n";
// 输出: "Coroutine created at: /app/server.php:42"

// 或以数组形式 [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### 查看协程挂起位置

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // 在此处挂起
});

suspend(); // 让协程启动

echo "Suspended at: " . $coro->getSuspendLocation() . "\n";
// 输出: "Suspended at: /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### 等待信息

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// 查看协程在等待什么
$info = $coro->getAwaitingInfo();
print_r($info);
```

对调试非常有用 -- 你可以立即看到协程来自哪里以及停在了哪里。

## 协程 vs 线程

| 协程                        | 线程                        |
|-------------------------------|-------------------------------|
| 轻量级                       | 重量级                       |
| 快速创建 (<1us)              | 创建缓慢 (~1ms)             |
| 单个操作系统线程              | 多个操作系统线程             |
| 协作式多任务                  | 抢占式多任务                 |
| 无竞态条件                    | 可能存在竞态条件             |
| 需要 await 点                 | 可以在任何地方被抢占         |
| 适用于 I/O 操作               | 适用于 CPU 密集型计算        |

## 使用 protect() 延迟取消

如果协程通过 `protect()` 处于受保护段内，取消会被延迟到受保护块完成之后：

```php
$coro = spawn(function() {
    $result = protect(function() {
        // 关键操作 -- 取消被延迟
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // 取消将在此处发生，在退出 protect() 之后
    echo "Result: $result\n";
});

suspend();

$coro->cancel(); // 取消被延迟 -- protect() 将完整执行
```

`isCancellationRequested()` 标志立即变为 `true`，而 `isCancelled()` 仅在协程实际终止后才变为 `true`。

## 类概览

```php
final class Async\Coroutine implements Async\Completable {

    /* 标识 */
    public getId(): int

    /* 优先级 */
    public asHiPriority(): Coroutine

    /* 上下文 */
    public getContext(): Async\Context

    /* 结果和错误 */
    public getResult(): mixed
    public getException(): mixed

    /* 状态 */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* 控制 */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* 调试 */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## 目录

- [Coroutine::getId](/zh/docs/reference/coroutine/get-id.html) -- 获取协程唯一标识符
- [Coroutine::asHiPriority](/zh/docs/reference/coroutine/as-hi-priority.html) -- 将协程标记为高优先级
- [Coroutine::getContext](/zh/docs/reference/coroutine/get-context.html) -- 获取协程的本地上下文
- [Coroutine::getResult](/zh/docs/reference/coroutine/get-result.html) -- 获取执行结果
- [Coroutine::getException](/zh/docs/reference/coroutine/get-exception.html) -- 获取协程的异常
- [Coroutine::isStarted](/zh/docs/reference/coroutine/is-started.html) -- 检查协程是否已启动
- [Coroutine::isQueued](/zh/docs/reference/coroutine/is-queued.html) -- 检查协程是否在队列中
- [Coroutine::isRunning](/zh/docs/reference/coroutine/is-running.html) -- 检查协程是否正在运行
- [Coroutine::isSuspended](/zh/docs/reference/coroutine/is-suspended.html) -- 检查协程是否已挂起
- [Coroutine::isCompleted](/zh/docs/reference/coroutine/is-completed.html) -- 检查协程是否已完成
- [Coroutine::isCancelled](/zh/docs/reference/coroutine/is-cancelled.html) -- 检查协程是否已被取消
- [Coroutine::isCancellationRequested](/zh/docs/reference/coroutine/is-cancellation-requested.html) -- 检查是否请求了取消
- [Coroutine::cancel](/zh/docs/reference/coroutine/cancel.html) -- 取消协程
- [Coroutine::finally](/zh/docs/reference/coroutine/on-finally.html) -- 注册完成处理器
- [Coroutine::getTrace](/zh/docs/reference/coroutine/get-trace.html) -- 获取挂起协程的调用栈
- [Coroutine::getSpawnFileAndLine](/zh/docs/reference/coroutine/get-spawn-file-and-line.html) -- 获取协程创建的文件和行号
- [Coroutine::getSpawnLocation](/zh/docs/reference/coroutine/get-spawn-location.html) -- 以字符串形式获取创建位置
- [Coroutine::getSuspendFileAndLine](/zh/docs/reference/coroutine/get-suspend-file-and-line.html) -- 获取协程挂起的文件和行号
- [Coroutine::getSuspendLocation](/zh/docs/reference/coroutine/get-suspend-location.html) -- 以字符串形式获取挂起位置
- [Coroutine::getAwaitingInfo](/zh/docs/reference/coroutine/get-awaiting-info.html) -- 获取等待信息

## 接下来

- [Scope](/zh/docs/components/scope.html) -- 管理协程组
- [取消机制](/zh/docs/components/cancellation.html) -- 取消和 protect() 详情
- [spawn()](/zh/docs/reference/spawn.html) -- 完整文档
- [await()](/zh/docs/reference/await.html) -- 完整文档
