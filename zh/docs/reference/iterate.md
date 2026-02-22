---
layout: docs
lang: zh
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /zh/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — 对数组或 Traversable 进行并发迭代，支持并发控制和派生协程的生命周期管理。"
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — 对数组或 `Traversable` 进行并发迭代，为每个元素调用 `callback`。

## 描述

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

在单独的协程中为 `iterable` 的每个元素执行 `callback`。
`concurrency` 参数允许限制同时运行的回调数量。
该函数会阻塞当前协程，直到所有迭代完成。

通过 `iterate()` 派生的所有协程在一个隔离的子 `Scope` 中运行。

## 参数

**`iterable`**
数组或实现 `Traversable` 的对象（包括生成器和 `ArrayIterator`）。

**`callback`**
为每个元素调用的函数。接受两个参数：`(mixed $value, mixed $key)`。
如果回调返回 `false`，迭代将停止。

**`concurrency`**
同时运行的最大回调数量。默认为 `0` — 使用默认限制，
所有元素并发处理。值为 `1` 表示在单个协程中执行。

**`cancelPending`**
控制迭代完成后回调内部通过 `spawn()` 派生的子协程的行为。
- `true`（默认）— 所有未完成的派生协程将以 `AsyncCancellation` 取消。
- `false` — `iterate()` 等待所有派生协程完成后才返回。

## 返回值

该函数没有返回值。

## 错误/异常

- `Error` — 如果在异步上下文之外或从调度器上下文中调用。
- `TypeError` — 如果 `iterable` 不是数组且未实现 `Traversable`。
- 如果回调抛出异常，迭代停止，剩余协程被取消，异常传播到调用代码。

## 示例

### 示例 #1 基本数组迭代

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "All requests completed\n";
});
?>
```

### 示例 #2 限制并发数

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // 同时处理不超过 10 个用户
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "User $userId loaded\n";
    }, concurrency: 10);

    echo "All users processed\n";
});
?>
```

### 示例 #3 按条件停止迭代

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Processing: $item\n";

        if ($item === 'cherry') {
            return false; // 停止迭代
        }
    });

    echo "Iteration finished\n";
});
?>
```

**输出：**
```
Processing: apple
Processing: banana
Processing: cherry
Iteration finished
```

### 示例 #4 迭代生成器

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: processing value $value\n";
    }, concurrency: 2);

    echo "All tasks completed\n";
});
?>
```

### 示例 #5 取消派生的协程（cancelPending = true）

默认情况下，回调中通过 `spawn()` 派生的协程在迭代完成后被取消：

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // 派生后台任务
        spawn(function() use ($value) {
            try {
                echo "Background task $value started\n";
                suspend();
                suspend();
                echo "Background task $value finished\n"; // 不会执行
            } catch (AsyncCancellation) {
                echo "Background task $value cancelled\n";
            }
        });
    });

    echo "Iteration finished\n";
});
?>
```

**输出：**
```
Background task 1 started
Background task 2 started
Background task 3 started
Background task 1 cancelled
Background task 2 cancelled
Background task 3 cancelled
Iteration finished
```

### 示例 #6 等待派生的协程（cancelPending = false）

如果传入 `cancelPending: false`，`iterate()` 将等待所有派生协程完成：

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // 派生后台任务
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // 所有后台任务已完成
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**输出：**
```
result-1, result-2, result-3
```

### 示例 #7 错误处理

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error processing element $value");
            }
            echo "Processed: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Caught: " . $e->getMessage() . "\n";
    }
});
?>
```

## 注意事项

> **注意：** `iterate()` 为所有派生的协程创建一个隔离的子 Scope。

> **注意：** 当传入数组时，`iterate()` 在迭代之前创建其副本。
> 在回调中修改原始数组不会影响迭代。

> **注意：** 如果 `callback` 返回 `false`，迭代停止，
> 但已运行的协程继续执行直到完成（或被取消，如果 `cancelPending = true`）。

## 变更日志

| 版本    | 说明                           |
|---------|--------------------------------|
| 1.0.0   | 添加了 `iterate()` 函数。    |

## 参见

- [spawn()](/zh/docs/reference/spawn.html) - 启动协程
- [await_all()](/zh/docs/reference/await-all.html) - 等待多个协程
- [Scope](/zh/docs/components/scope.html) - Scope 概念
- [Cancellation](/zh/docs/components/cancellation.html) - 协程取消
