---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "注册协程完成时调用的处理器。"
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

注册一个回调函数，在协程完成时调用，无论结果如何（成功、错误或取消）。

如果在调用 `finally()` 时协程已经完成，回调将立即执行。

可以注册多个处理器——它们按添加顺序执行。

## 参数

**callback**
: 处理器函数。接收协程对象作为参数。

## 示例

### 示例 #1 基本用法

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### 示例 #2 资源清理

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### 示例 #3 多个处理器

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### 示例 #4 完成后注册

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// 协程已完成 -- 回调立即执行
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## 参见

- [Coroutine::isCompleted](/zh/docs/reference/coroutine/is-completed.html) -- 检查是否已完成
- [Coroutine::getResult](/zh/docs/reference/coroutine/get-result.html) -- 获取结果
