---
layout: docs
lang: zh
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /zh/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "获取协程中发生的异常。"
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

返回协程中发生的异常。如果协程成功完成或尚未完成，则返回 `null`。如果协程被取消，则返回 `AsyncCancellation` 对象。

## 返回值

`mixed` -- 异常或 `null`。

- `null` -- 如果协程尚未完成或成功完成
- `Throwable` -- 如果协程因错误而完成
- `AsyncCancellation` -- 如果协程被取消

## 错误

如果协程当前正在运行，则抛出 `RuntimeException`。

## 示例

### 示例 #1 成功完成

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### 示例 #2 异常完成

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // 在 await 期间捕获
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### 示例 #3 已取消的协程

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## 参见

- [Coroutine::getResult](/zh/docs/reference/coroutine/get-result.html) -- 获取结果
- [Coroutine::isCancelled](/zh/docs/reference/coroutine/is-cancelled.html) -- 检查是否已取消
- [Exceptions](/zh/docs/components/exceptions.html) -- 错误处理
