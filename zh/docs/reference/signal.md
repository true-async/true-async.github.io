---
layout: docs
lang: zh
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /zh/docs/reference/signal.html
page_title: "signal()"
description: "signal() — 等待操作系统信号，支持通过 Completable 取消。"
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — 等待操作系统信号。返回一个 `Future`，当收到信号时以 `Signal` 值解析。

## 描述

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

创建一次性的操作系统信号处理器。每次调用 `signal()` 都会创建一个新的 `Future`，当首次收到指定信号时解析。
如果提供了 `$cancellation` 参数，当取消触发时（例如超时），`Future` 将被拒绝。

对同一信号多次调用 `signal()` 互不影响 — 每个都会收到通知。

## 参数

**`signal`**
`Async\Signal` 枚举值，指定期望的信号。例如：`Signal::SIGINT`、`Signal::SIGTERM`、`Signal::SIGUSR1`。

**`cancellation`**
可选的实现 `Async\Completable` 的对象（例如调用 `timeout()` 的结果）。如果取消对象在信号到达之前触发，`Future` 将以相应的异常（例如 `Async\TimeoutException`）被拒绝。

如果在调用时取消对象已经完成，`signal()` 立即返回一个被拒绝的 `Future`。

## 返回值

返回 `Async\Future<Async\Signal>`。当信号被接收时，`Future` 以对应接收信号的 `Async\Signal` 枚举值解析。

## 错误/异常

- `Async\TimeoutException` — 如果在信号接收之前超时触发。
- `Async\AsyncCancellation` — 如果因其他原因发生取消。

## 示例

### 示例 #1 带超时等待信号

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Signal received: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Signal not received within 5 seconds\n";
}
?>
```

### 示例 #2 从另一个协程接收信号

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Signal received: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### 示例 #3 收到 SIGTERM 时优雅关闭

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM received, shutting down...\n";
    graceful_shutdown();
});
?>
```

### 示例 #4 已过期的超时

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // 超时已过期

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## 注意事项

> **注意：** 每次调用 `signal()` 创建一个**一次性**处理器。要再次等待同一信号，需要再次调用 `signal()`。

> **注意：** `Signal::SIGINT` 和 `Signal::SIGBREAK` 在所有平台上都可用，包括 Windows。`SIGUSR1`、`SIGUSR2` 等 POSIX 信号仅在 Unix 系统上可用。

> **注意：** `Signal::SIGKILL` 和 `Signal::SIGSEGV` 无法被捕获 — 这是操作系统的限制。

## Signal

`Async\Signal` 枚举定义了可用的操作系统信号：

| 值 | 信号 | 说明 |
|-------|--------|-------------|
| `Signal::SIGHUP` | 1 | 终端连接丢失 |
| `Signal::SIGINT` | 2 | 中断（Ctrl+C） |
| `Signal::SIGQUIT` | 3 | 退出并转储核心 |
| `Signal::SIGILL` | 4 | 非法指令 |
| `Signal::SIGABRT` | 6 | 异常终止 |
| `Signal::SIGFPE` | 8 | 浮点运算错误 |
| `Signal::SIGKILL` | 9 | 无条件终止 |
| `Signal::SIGUSR1` | 10 | 用户自定义信号 1 |
| `Signal::SIGSEGV` | 11 | 内存访问违规 |
| `Signal::SIGUSR2` | 12 | 用户自定义信号 2 |
| `Signal::SIGTERM` | 15 | 终止请求 |
| `Signal::SIGBREAK` | 21 | 中断（Ctrl+Break，Windows） |
| `Signal::SIGABRT2` | 22 | 异常终止（替代） |
| `Signal::SIGWINCH` | 28 | 终端窗口大小变化 |

## 参见

- [timeout()](/zh/docs/reference/timeout.html) — 创建超时以限制等待时间
- [await()](/zh/docs/reference/await.html) — 等待 Future 结果
- [graceful_shutdown()](/zh/docs/reference/graceful-shutdown.html) — 优雅关闭调度器
- [Cancellation](/zh/docs/components/cancellation.html) — 取消机制
