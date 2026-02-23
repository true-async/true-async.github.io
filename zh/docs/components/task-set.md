---
layout: docs
lang: zh
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /zh/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — 动态任务集合，结果交付后自动清理。"
---

# Async\TaskSet 类

(PHP 8.6+, True Async 1.0)

## 简介

`TaskGroup` 非常适合以结果为导向而非以任务本身为导向的场景。
然而，在很多情况下，你需要控制任务数量，同时以流的方式消费结果。

典型示例：

- **Supervisor**：监控任务并在任务完成时做出响应的代码。
- **协程池**：固定数量的协程处理数据。

**TaskSet** 正是为解决这些问题而设计的。它在通过 `joinNext()`、`joinAll()`、`joinAny()` 或 `foreach` 交付结果时，自动移除已完成的任务。

## 与 TaskGroup 的区别

| 特性                  | TaskGroup                          | TaskSet                                    |
|---------------------------|------------------------------------|--------------------------------------------|
| 结果存储            | 所有结果保留至显式请求 | 交付后移除                     |
| 重复方法调用     | 幂等 — 返回相同结果           | 每次调用 — 获取下一个元素                   |
| `count()`                 | 总任务数              | 未交付的任务数                |
| 等待方法           | `all()`、`race()`、`any()`         | `joinAll()`、`joinNext()`、`joinAny()`     |
| 迭代                 | 条目保留                     | `foreach` 后条目被移除            |
| 适用场景                  | 固定任务集合                 | 动态任务流                        |

## 幂等性 vs 消费式

**这是** `TaskSet` 和 `TaskGroup` **的核心概念区别。**

**TaskGroup 是幂等的。** 调用 `race()`、`any()`、`all()` 始终返回
相同的结果。通过 `foreach` 迭代始终遍历所有任务。
结果存储在组中，可重复访问：

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() 始终返回相同的第一个完成的任务
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — 相同的结果！

// all() 始终返回完整数组
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — 相同的数组！

// foreach 始终遍历所有元素
foreach ($group as $key => [$result, $error]) { /* 3 次迭代 */ }
foreach ($group as $key => [$result, $error]) { /* 再次 3 次迭代 */ }

echo $group->count(); // 3 — 始终为 3
```

**TaskSet 是消费式的。** 每次调用 `joinNext()` / `joinAny()` 会提取
下一个元素并将其从集合中移除。重复的 `foreach` 不会找到
已交付的条目。这种行为类似于从队列或 channel 中读取：

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() 每次返回下一个结果
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — 不同的结果！
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — 集合为空

// 完全消费后调用 joinAll() — 空数组
$set->seal();
$rest = $set->joinAll()->await(); // [] — 没有可返回的内容
```

迭代也遵循相同的逻辑：

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// 第一次 foreach 消费所有结果
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// 第二次 foreach — 为空，没有可迭代的内容
foreach ($set as $key => [$result, $error]) {
    echo "this won't execute\n";
}
```

> **规则：** 如果需要重复访问结果 — 使用 `TaskGroup`。
> 如果结果只处理一次且需要释放内存 — 使用 `TaskSet`。

## Join 方法语义

与 `TaskGroup` 中 `race()` / `any()` / `all()` 将条目保留在组中不同，
`TaskSet` 使用具有 **join** 语义的方法 — 结果交付后，条目被移除：

- **`joinNext()`** — 类似于 `race()`：返回第一个完成的任务的结果（成功或错误），
  条目从集合中移除。
- **`joinAny()`** — 类似于 `any()`：返回第一个 *成功* 完成的任务的结果，
  条目从集合中移除。错误被跳过。
- **`joinAll()`** — 类似于 `all()`：返回所有结果的数组，
  所有条目从集合中移除。

## 自动清理

自动清理在所有结果交付点生效：

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

通过 `foreach` 迭代时，每个已处理的条目会立即被移除：

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() 在每次迭代中递减
    process($result);
}
```

## 并发限制

与 `TaskGroup` 一样，`TaskSet` 支持并发限制：

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

超出限制的任务会被排队，在有空闲槽位时自动启动。

## 类概要

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* 方法 */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* 添加任务 */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* 等待结果（带自动清理） */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* 生命周期 */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* 状态 */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* 等待完成 */
    public awaitCompletion(): void

    /* 迭代（带自动清理） */
    public getIterator(): Iterator
}
```

## 示例

### joinAll() — 并行加载并自动清理

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0，所有条目已移除

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — 按完成顺序处理任务

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Got result, remaining: {$set->count()}\n";
}
```

### joinAny() — 容错搜索

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// 第一个成功的结果，条目被移除
$result = $set->joinAny()->await();
echo "Found, active tasks: {$set->count()}\n";
```

### foreach — 流式处理

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Error processing $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // 条目被移除，内存被释放
}
```

### Worker 循环与动态任务添加

```php
$set = new Async\TaskSet(concurrency: 10);

// 一个协程添加任务
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// 另一个协程处理结果
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Error: {$error->getMessage()}");
        }
    }
});
```

## 其他语言中的等价物

| 功能              | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| 动态集合          | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| 自动清理         | 自动                         | 手动管理             | 手动管理         | 手动管理      |
| 并发限制    | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | 带缓冲 channel       |
| 流式迭代  | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## 目录

- [TaskSet::__construct](/zh/docs/reference/task-set/construct.html) — 创建任务集合
- [TaskSet::spawn](/zh/docs/reference/task-set/spawn.html) — 使用自增键添加任务
- [TaskSet::spawnWithKey](/zh/docs/reference/task-set/spawn-with-key.html) — 使用指定键添加任务
- [TaskSet::joinNext](/zh/docs/reference/task-set/join-next.html) — 获取第一个完成的任务的结果
- [TaskSet::joinAny](/zh/docs/reference/task-set/join-any.html) — 获取第一个成功完成的任务的结果
- [TaskSet::joinAll](/zh/docs/reference/task-set/join-all.html) — 等待所有任务并获取结果
- [TaskSet::seal](/zh/docs/reference/task-set/seal.html) — 封闭集合以禁止新任务
- [TaskSet::cancel](/zh/docs/reference/task-set/cancel.html) — 取消所有任务
- [TaskSet::dispose](/zh/docs/reference/task-set/dispose.html) — 销毁集合的作用域
- [TaskSet::finally](/zh/docs/reference/task-set/finally.html) — 注册完成回调
- [TaskSet::isFinished](/zh/docs/reference/task-set/is-finished.html) — 检查所有任务是否已完成
- [TaskSet::isSealed](/zh/docs/reference/task-set/is-sealed.html) — 检查集合是否已封闭
- [TaskSet::count](/zh/docs/reference/task-set/count.html) — 获取未交付的任务数量
- [TaskSet::awaitCompletion](/zh/docs/reference/task-set/await-completion.html) — 等待所有任务完成
- [TaskSet::getIterator](/zh/docs/reference/task-set/get-iterator.html) — 以自动清理方式迭代结果
