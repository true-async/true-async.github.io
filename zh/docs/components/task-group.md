---
layout: docs
lang: zh
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /zh/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- 用于管理任务组的高级结构化并发模式。"
---

# Async\TaskGroup 类

(PHP 8.6+, True Async 1.0)

## 简介

在使用协程时，你经常需要启动多个任务并等待它们的结果。
直接使用 `spawn()` 和 `await()`，开发者需要负责确保
每个协程要么被等待，要么被取消。被遗忘的协程会继续运行，
未处理的错误会丢失，取消一组任务需要手动编写代码。

`await_all()` 和 `await_any()` 函数不考虑不同任务之间的逻辑关系。
例如，当你需要发出多个请求、取第一个结果并取消其余请求时，
`await_any()` 需要程序员编写额外的代码来取消剩余任务。
这类代码可能相当复杂，因此在这种情况下 `await_all()` 和 `await_any()` 应被视为反模式。

使用 `Scope` 来实现此目的不太合适，因为任务协程可能创建其他子协程，
这要求程序员维护一个任务协程列表并单独跟踪它们。

**TaskGroup** 解决了所有这些问题。它是一个高级结构化并发模式，
保证：所有任务都将被正确等待或取消。它在逻辑上对任务进行分组，
允许将它们作为一个整体来操作。

## 等待策略

`TaskGroup` 提供了多种等待结果的策略。
每种策略返回一个 `Future`，允许传递超时：`->await(Async\timeout(5.0))`。

- **`all()`** -- 返回一个 `Future`，解析为所有任务结果的数组，
  如果至少一个任务抛出异常则拒绝为 `CompositeException`。
  使用 `ignoreErrors: true` 参数时，只返回成功的结果。
- **`race()`** -- 返回一个 `Future`，解析为第一个完成任务的结果，
  无论是成功还是失败。其他任务继续运行。
- **`any()`** -- 返回一个 `Future`，解析为第一个*成功*完成任务的结果，
  忽略错误。如果所有任务都失败了 -- 拒绝为 `CompositeException`。
- **`awaitCompletion()`** -- 等待所有任务完全完成，以及 `Scope` 中的其他协程。

## 并发限制

当指定了 `concurrency` 参数时，`TaskGroup` 作为协程池工作：
超过限制的任务在队列中等待，直到出现空闲槽位才创建协程。
这在处理大量任务时可以节省内存并控制负载。

## TaskGroup 和 Scope

`TaskGroup` 使用 `Scope` 来管理任务协程的生命周期。
创建 `TaskGroup` 时，你可以传递一个现有的 `Scope`，或让 `TaskGroup` 从当前作用域创建一个子 `Scope`。
添加到 `TaskGroup` 的所有任务都在此 `Scope` 内执行。
这意味着当 `TaskGroup` 被取消或销毁时，
所有协程将自动被取消，确保安全的资源管理并防止泄漏。

## 密封和迭代

`TaskGroup` 允许动态添加任务，直到使用 `seal()` 方法将其密封。

`all()` 方法返回一个 `Future`，当队列中所有现有任务完成时触发。这允许在循环中使用 `TaskGroup`，
动态添加任务，并调用 `all()` 获取当前任务集的结果。

`TaskGroup` 还支持 `foreach` 按结果就绪顺序迭代。
在这种情况下，添加所有任务后必须调用 `seal()` 以表示不会再有新任务，
`foreach` 可以在处理完所有结果后结束。

## 类概览

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* 方法 */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* 添加任务 */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* 等待结果 */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* 生命周期 */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* 状态 */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* 结果和错误 */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* 迭代 */
    public getIterator(): Iterator
}
```

## 示例

### all() -- 并行数据加载

最常见的场景 -- 同时从多个源加载数据：

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

所有三个请求并行执行。如果其中任何一个抛出异常，
`all()` 返回一个以 `CompositeException` 拒绝的 `Future`。

### race() -- 对冲请求

"对冲请求"模式 -- 将相同的请求发送到多个副本，
取第一个响应。这可以减少慢速或过载服务器的延迟：

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// 第一个响应即为结果，其他任务继续运行
$product = $group->race()->await();
```

### any() -- 容错搜索

查询多个提供者，取第一个成功的响应，忽略错误：

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() 忽略失败的提供者，返回第一个成功的结果
$results = $group->any()->await();

// 失败提供者的错误必须显式处理，否则析构函数会抛出异常
$group->suppressErrors();
```

如果所有提供者都失败了，`any()` 将抛出包含所有错误的 `CompositeException`。

### 并发限制 -- 处理队列

处理 10,000 个任务，但同时不超过 50 个：

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` 自动将任务排队。只有当出现空闲槽位时才创建协程，
在大量任务时节省内存。

### 按完成顺序迭代结果

不必等待所有任务完成即可处理结果：

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // 结果按就绪顺序到达，而非添加顺序
    saveToStorage($result);
}
```

### 任务组超时

限制等待结果的时间：

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Failed to get data within 5 seconds";
}
```

## 其他语言中的类似物

| 能力                    | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| 结构化并发              | `seal()` + `all()->await()`         | `async with` 块                | `try-with-resources` + `join()`          | 通过作用域自动实现         |
| 等待策略                | `all()`、`race()`、`any()` -> Future | 仅 all（通过 `async with`）     | `ShutdownOnSuccess`、`ShutdownOnFailure` | `async`/`await`、`select` |
| 并发限制                | `concurrency: N`                    | 无（需要 `Semaphore`）          | 无                                       | 无（需要 `Semaphore`）    |
| 结果迭代                | `foreach` 按完成顺序               | 无                              | 无                                       | `Channel`                 |
| 错误处理                | `CompositeException`、`getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | 异常取消作用域            |

PHP `TaskGroup` 组合了在其他语言中分散在多个原语中的功能：
无需信号量的并发限制、单个对象中的多种等待策略，以及按完成顺序迭代结果。

## 目录

- [TaskGroup::__construct](/zh/docs/reference/task-group/construct.html) -- 创建任务组
- [TaskGroup::spawn](/zh/docs/reference/task-group/spawn.html) -- 使用自增键添加任务
- [TaskGroup::spawnWithKey](/zh/docs/reference/task-group/spawn-with-key.html) -- 使用显式键添加任务
- [TaskGroup::all](/zh/docs/reference/task-group/all.html) -- 等待所有任务并获取结果
- [TaskGroup::race](/zh/docs/reference/task-group/race.html) -- 获取第一个完成任务的结果
- [TaskGroup::any](/zh/docs/reference/task-group/any.html) -- 获取第一个成功任务的结果
- [TaskGroup::awaitCompletion](/zh/docs/reference/task-group/await-completion.html) -- 等待所有任务完成
- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) -- 密封组，不再接受新任务
- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) -- 取消所有任务
- [TaskGroup::dispose](/zh/docs/reference/task-group/dispose.html) -- 销毁组的作用域
- [TaskGroup::finally](/zh/docs/reference/task-group/finally.html) -- 注册完成处理器
- [TaskGroup::isFinished](/zh/docs/reference/task-group/is-finished.html) -- 检查所有任务是否已完成
- [TaskGroup::isSealed](/zh/docs/reference/task-group/is-sealed.html) -- 检查组是否已密封
- [TaskGroup::count](/zh/docs/reference/task-group/count.html) -- 获取任务数量
- [TaskGroup::getResults](/zh/docs/reference/task-group/get-results.html) -- 获取成功结果数组
- [TaskGroup::getErrors](/zh/docs/reference/task-group/get-errors.html) -- 获取错误数组
- [TaskGroup::suppressErrors](/zh/docs/reference/task-group/suppress-errors.html) -- 将错误标记为已处理
- [TaskGroup::getIterator](/zh/docs/reference/task-group/get-iterator.html) -- 按完成顺序迭代结果
