---
layout: tutorial
lang: zh
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /zh/tutors/05-timeout.html
page_title: "超时"
description: "使用 timeout() 限制 await() 的等待时长。"
---

# 限制 await 的等待时长

你常常需要保证某个操作不会耗时超过某个给定的时间。
例如，如果 `UserDirectory` 太长时间没有响应，会让 `API` 显得像是坏掉了。
这里有两种可能的解决方案：
1. 在 `file_get_contents` 操作层面设置超时，并修改函数的代码。
2. 直接给 `await` 加上一个限制。

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

限制 `await` 的好处在于无需改动 `validateToken` 的代码。
同时请注意，这里是 `catch (OperationCanceledException $e)`，
而不是你可能预期的 `catch (TimeoutException $e)`。

## OperationCanceledException

如果我们运行下面的代码

```php
use function Async\timeout;

$token = timeout(2000);   // just an object; nothing happens
```

The token only takes effect once it is handed to an operation as a cancellation argument:

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // 来自 TimeoutException 的消息
}
```

请注意：当令牌触发时，你收到的是 `OperationCanceledException`，而不是 `TimeoutException`。超时本身在其内部，
位于 `getPrevious()` 中。这是有意为之的，目的是简化 `await` 的 `try-catch` 处理逻辑，
并清晰地把一次被取消的等待与协程内部抛出的异常区分开来。
协程通常不应该自己抛出 `OperationCanceledException`。

用来限制 `await` 等待的东西不一定非得是 `timeout()`，它也可以是任何其他协程，
或者一个 `Future`，也就是代表某个任意操作完成情况的逻辑契约。
