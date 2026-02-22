---
layout: docs
lang: zh
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /zh/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — 在新协程中启动函数。完整文档：参数、返回值、示例。"
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — 在新协程中启动函数执行。创建一个协程。

## 描述

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

创建并启动一个新协程。协程将异步执行。

## 参数

**`callback`**
在协程中执行的函数或闭包。可以是任何有效的可调用类型。

**`args`**
传递给 `callback` 的可选参数。参数按值传递。

## 返回值

返回一个表示已启动协程的 `Async\Coroutine` 对象。该对象可用于：
- 通过 `await()` 获取结果
- 通过 `cancel()` 取消执行
- 检查协程的状态

## 示例

### 示例 #1 spawn() 的基本用法

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// 协程异步执行
echo "Coroutine started\n";

$result = await($coroutine);
echo "Result received\n";
?>
```

### 示例 #2 多个协程

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// 所有请求并发执行
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Downloaded: " . strlen($content) . " bytes\n";
}
?>
```

### 示例 #3 使用闭包

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### 示例 #4 spawn 与 Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// 等待作用域中所有协程完成
$scope->awaitCompletion();
?>
```

### 示例 #5 传递参数

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Sum: $result\n"; // Sum: 60
?>
```

### 示例 #6 错误处理

处理协程异常的一种方式是使用 `await()` 函数：

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Random error");
    }
    return "Success";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## 注意事项

> **注意：** 通过 `spawn()` 创建的协程并发执行，但不是并行执行。
> PHP TrueAsync 使用单线程执行模型。

> **注意：** 参数按值传递给协程。
> 要按引用传递，请使用带有 `use (&$var)` 的闭包。

## 变更日志

| 版本     | 说明                            |
|----------|---------------------------------|
| 1.0.0    | 添加了 `spawn()` 函数          |

## 参见

- [await()](/zh/docs/reference/await.html) - 等待协程结果
- [suspend()](/zh/docs/reference/suspend.html) - 挂起协程执行
