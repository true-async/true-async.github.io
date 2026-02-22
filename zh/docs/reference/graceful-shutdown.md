---
layout: docs
lang: zh
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /zh/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — 优雅关闭调度器并取消所有协程。"
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — 发起调度器的优雅关闭。所有协程收到取消请求。

## 描述

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

启动优雅关闭流程：取消所有活跃协程，应用程序继续运行直到它们自然完成。

## 参数

**`cancellationError`**
可选的取消错误，传递给协程。如果未指定，则使用默认消息。

## 返回值

没有返回值。

## 示例

### 示例 #1 处理终止信号

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// 处理请求的服务器
spawn(function() {
    // 收到信号时 — 优雅关闭
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Server shutdown'));
    });

    while (true) {
        // 处理请求...
    }
});
?>
```

## 注意事项

> **注意：** 在调用 `graceful_shutdown()` **之后**创建的协程将被立即取消。

> **注意：** `exit` 和 `die` 会自动触发优雅关闭。

## 参见

- [Cancellation](/zh/docs/components/cancellation.html) — 取消机制
- [Scope](/zh/docs/components/scope.html) — 生命周期管理
