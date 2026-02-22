---
layout: docs
lang: zh
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /zh/docs/components/future.html
page_title: "Future"
description: "TrueAsync 中的 Future -- 结果承诺、map/catch/finally 转换链、FutureState 和诊断。"
---

# Future：结果承诺

## 什么是 Future

`Async\Future` 是一个表示可能尚未就绪的操作结果的对象。
Future 允许你：

- 通过 `await()` 或 `$future->await()` 等待结果
- 通过 `map()`、`catch()`、`finally()` 构建转换链
- 通过 `cancel()` 取消操作
- 通过静态工厂方法创建已完成的 Future

Future 类似于 JavaScript 中的 `Promise`，但与 TrueAsync 协程集成。

## Future 和 FutureState

Future 被分为两个类，职责清晰分离：

- **`FutureState`** -- 一个可变容器，通过它写入结果
- **`Future`** -- 一个只读包装器，通过它读取和转换结果

```php
<?php
use Async\Future;
use Async\FutureState;

// 创建 FutureState -- 它拥有状态
$state = new FutureState();

// 创建 Future -- 它提供对结果的访问
$future = new Future($state);

// 将 $future 传递给消费者
// 将 $state 传递给生产者

// 生产者完成操作
$state->complete(42);

// 消费者获取结果
$result = $future->await(); // 42
?>
```

这种分离保证了消费者不能意外地完成 Future -- 只有持有 `FutureState` 的一方才有这个权利。

## 创建 Future

### 通过 FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// 在另一个协程中完成
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### 静态工厂方法

用于创建已完成的 Future：

```php
<?php
use Async\Future;

// 成功完成的 Future
$future = Future::completed(42);
$result = $future->await(); // 42

// 带错误的 Future
$future = Future::failed(new \RuntimeException('Something went wrong'));
$result = $future->await(); // 抛出 RuntimeException
?>
```

## 转换链

Future 支持三种转换方法，工作方式类似于 JavaScript 中的 Promise：

### map() -- 转换结果

仅在成功完成时调用。返回带有转换后结果的新 Future：

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Result: $value");

$state->complete(21);

echo $asString->await(); // "Result: 42"
?>
```

### catch() -- 处理错误

仅在出错时调用。允许从异常中恢复：

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Default value';
});

$state->error(new \RuntimeException('Error'));

echo $safe->await(); // "Default value"
?>
```

### finally() -- 无论结果如何都执行

始终调用 -- 无论成功还是出错。父 Future 的结果原样传递给子级：

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // 释放资源
    echo "Operation completed\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data"（结果原样传递）
?>
```

### 组合链

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Unknown')
    ->catch(fn(\Throwable $e) => 'Error: ' . $e->getMessage())
    ->finally(function($value) {
        // 日志记录
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### 独立订阅者

对同一个 Future 的每次 `map()` 调用创建一个**独立**的链。订阅者之间互不影响：

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// 来自同一个 Future 的两条独立链
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### 链中的错误传播

如果源 Future 以错误完成，`map()` 被**跳过**，错误直接传递给 `catch()`：

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "This code won't execute\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recovered: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Source error'));

echo await($result) . "\n"; // "Recovered: Source error"
?>
```

如果在 `map()` **内部**发生异常，它会被后续的 `catch()` 捕获：

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Error in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Caught: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Caught: Error in map"
?>
```

## 等待结果

### 通过 await() 函数

```php
<?php
use function Async\await;

$result = await($future);
```

### 通过 $future->await() 方法

```php
<?php
$result = $future->await();

// 带取消超时
$result = $future->await(Async\timeout(5000));
```

## 取消 Future

```php
<?php
use Async\AsyncCancellation;

// 使用默认消息取消
$future->cancel();

// 使用自定义错误取消
$future->cancel(new AsyncCancellation('Operation is no longer needed'));
```

## 抑制警告：ignore()

如果 Future 未被使用（既未调用 `await()`、`map()`、`catch()` 也未调用 `finally()`），TrueAsync 将发出警告。
要显式抑制此警告：

```php
<?php
$future->ignore();
```

此外，如果 Future 以错误完成且该错误未被处理，TrueAsync 也会对此发出警告。`ignore()` 同样会抑制此警告。

## FutureState：完成操作

### complete() -- 成功完成

```php
<?php
$state->complete($result);
```

### error() -- 以错误完成

```php
<?php
$state->error(new \RuntimeException('Error'));
```

### 约束

- `complete()` 和 `error()` 只能调用**一次**。重复调用将抛出 `AsyncException`。
- 调用 `complete()` 或 `error()` 之后，Future 的状态不可变。

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## 诊断

两个类（`Future` 和 `FutureState`）都提供诊断方法：

```php
<?php
// 检查状态
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Future 创建的位置
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Future 完成的位置
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" 或 "unknown"

// 等待信息
$future->getAwaitingInfo(); // array
```

## 实际示例：HTTP 客户端

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// 使用
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## 另请参阅

- [await()](/zh/docs/reference/await.html) -- 等待完成
- [协程](/zh/docs/components/coroutines.html) -- 基本并发单元
- [取消机制](/zh/docs/components/cancellation.html) -- 取消机制
