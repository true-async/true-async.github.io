---
layout: tutorial
lang: zh
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /zh/tutors/04-exceptions.html
page_title: "异常"
description: "来自协程的异常如何通过 await() 传播。"
---

# 协程中的异常

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

上一章的 `validateToken` 函数有几个问题。
如果 `UserDirectory` 没有响应（超时、网络中断、DNS 解析失败），`file_get_contents` 会返回 `false`。
`json_decode(false)` 返回 `null`，而 `null->valid` 也是 `null`。函数返回了一个假值，
这与令牌确实无效时得到的结果相同。`validateToken` 没有办法区分“令牌已过期”
和“`UserDirectory` 没有响应”，尽管这是两种完全不同的情况。

正确的做法是在服务没有响应时抛出异常：

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

但如果异常是在协程内部抛出的，会发生什么？
如果异常在普通 `PHP` 代码中抛出而没有人捕获它，`PHP` 会以一条 Unhandled Exception 消息终止。
那协程呢？

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

乍一看似乎没什么区别。但事实远非如此。
协程属于 `Scheduler` 组件，它负责在各个协程之间切换。每个协程都在自己的逻辑线程中运行。
如果一个未处理的异常抵达了协程的最终处理器，它就会被存储在协程的句柄上。

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

换句话说，只要还有人持有对 `$coroutine` 的引用，异常就不会终止程序。
这套逻辑保证了 `await` 操作的幂等性。

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

对同一个协程重复调用 `await` 会产生相同的行为，无论该协程是否仍在运行。
这让你能够把协程当作一个 `Future` 来对待，也就是一个对将来某个时刻可获取结果的承诺。
如果结果已经存在，`await` 会立即返回它。

现在我们可以改进那段校验令牌并更新个人资料的代码，为其加上异常处理：

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // 也许稍后重试该操作会更好？
}
```

> 重要！
> 在调用 `await` 或任何其他 `await_*` 操作之后，
> 协程会被标记为已处理，其异常将不再导致
> PHP 程序终止。
