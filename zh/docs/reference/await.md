---
layout: docs
lang: zh
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /zh/docs/reference/await.html
page_title: "await()"
description: "await() — 等待协程或 Future 完成。完整文档：参数、异常、示例。"
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — 等待协程、`Async\Future` 或任何其他 `Async\Completable` 完成。
返回结果或抛出异常。

## 描述

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

挂起当前协程的执行，直到指定的 `Async\Completable` `$awaitable` 完成（或直到 `$cancellation` 触发，如果提供了的话），并返回结果。
如果 `awaitable` 已经完成，则立即返回结果。

如果协程以异常结束，该异常将被传播到调用代码。

## 参数

**`awaitable`**
实现 `Async\Completable` 接口（继承自 `Async\Awaitable`）的对象。通常为：
- `Async\Coroutine` - 调用 `spawn()` 的结果
- `Async\TaskGroup` - 任务组
- `Async\Future` - Future 值

**`cancellation`**
可选的 `Async\Completable` 对象；当其完成时，等待将被取消。

## 返回值

返回协程返回的值。返回类型取决于协程。

## 错误/异常

如果协程以异常结束，`await()` 将重新抛出该异常。

如果协程被取消，将抛出 `Async\AsyncCancellation`。

如果取消令牌（`$cancellation`）触发，将抛出 `Async\OperationCanceledException`。令牌的原始异常可通过 `$e->getPrevious()` 获取。这使得可以区分令牌触发和 awaitable 对象本身抛出的异常。

## 异常如何传递

当协程以异常结束时，**结果会"沉淀"在它的句柄上**，等着有人来取。行为对称于 `Async\Future`，
取决于是否有 Scheduler 之外的代码持有该协程句柄：

- **句柄被持有**（`$coro = spawn(...)`、协程被放进数组、传给 `await_all()` 等等） ——
  异常存放在句柄上等待。之后任何 `await($coro)` 都能取到它，哪怕协程早已完成。
- **没人持有句柄**（fire-and-forget —— `spawn(...)` 不保存返回值） ——
  异常会在句柄销毁时通过 fire-and-forget safety net 触发。

最实际的含义是：**即使发生竞态，`await` 也能捕获到异常**：

```php
use function Async\spawn;
use function Async\await;

$coro = spawn(function () {
    throw new RuntimeException('boom');
});

// 协程可能比我们抵达 await 还早完成 —— 没关系。
// 异常会安静地等在这里：
try {
    await($coro);
} catch (RuntimeException $e) {
    echo "捕获: ", $e->getMessage(), "\n"; // 捕获: boom
}
```

`await_all()`、`await_any_or_fail()` 等其他 `await_*()` 同理：可以把协程放进数组，
让它们并发跑一会儿再等待。异常会通过 `await` 汇总过来。

> 当 parent scope 先于自己的协程死掉时，子协程会按规格收到 `AsyncCancellation`。
> 这条分支单独处理，不受句柄是否被持有影响。

## 示例

### 示例 #1 await() 的基本用法

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### 示例 #2 顺序等待

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### 示例 #3 异常处理

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Failed to fetch data");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Data received\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### 示例 #4 await 与 TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// 获取所有结果的数组
$results = await($taskGroup);
print_r($results); // 结果数组
?>
```

### 示例 #5 对同一协程多次 await

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// 第一次 await 将等待结果
$result1 = await($coroutine);
echo "$result1\n";

// 后续的 await 立即返回结果
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### 示例 #6 在协程内部使用 await

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Parent coroutine started\n";

    $child = spawn(function() {
        echo "Child coroutine running\n";
        Async\delay(1000);
        return "Result from child";
    });

    echo "Waiting for child...\n";
    $result = await($child);
    echo "Received: $result\n";
});

echo "Main code continues\n";
?>
```

## 变更日志

| 版本     | 说明                            |
|----------|---------------------------------|
| 1.0.0    | 添加了 `await()` 函数          |

## 参见

- [spawn()](/zh/docs/reference/spawn.html) - 启动协程
- [suspend()](/zh/docs/reference/suspend.html) - 挂起执行
