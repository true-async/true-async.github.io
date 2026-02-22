---
layout: docs
lang: zh
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /zh/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — 创建超时对象以限制等待时间。"
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — 创建一个 `Async\Timeout` 对象，在指定的毫秒数后触发。

## 描述

```php
timeout(int $ms): Async\Awaitable
```

创建一个计时器，在 `$ms` 毫秒后抛出 `Async\TimeoutException`。
用作 `await()` 和其他函数中的等待时间限制器。

## 参数

**`ms`**
时间（毫秒）。必须大于 0。

## 返回值

返回实现 `Async\Completable` 的 `Async\Timeout` 对象。

## 错误/异常

- `ValueError` — 如果 `$ms` <= 0。

## 示例

### 示例 #1 在 await() 上设置超时

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "Request did not complete within 3 seconds\n";
}
?>
```

### 示例 #2 在任务组上设置超时

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all requests completed within 5 seconds\n";
}
?>
```

### 示例 #3 取消超时

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// 操作更快完成 — 取消计时器
$timer->cancel();
?>
```

## 参见

- [delay()](/zh/docs/reference/delay.html) — 挂起协程
- [await()](/zh/docs/reference/await.html) — 带取消的等待
