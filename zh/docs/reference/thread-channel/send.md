---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "向线程通道发送值，如果通道无法立即接受则阻塞调用线程。"
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

向通道发送值。这是一个**阻塞**操作 — 如果通道无法立即接受值，调用线程将被阻塞。

- 对于**无缓冲通道**（`capacity = 0`），线程阻塞直到另一个线程调用 `recv()`。
- 对于**有缓冲通道**，只有当缓冲区已满时线程才会阻塞，一旦接收方取走一个槽位即解除阻塞。

与 `Channel::send()`（挂起协程）不同，`ThreadChannel::send()` 会阻塞整个操作系统线程。请相应地设计架构 — 例如，保持发送线程可以自由阻塞，或使用有缓冲通道来减少争用。

值在放入通道之前会被**深拷贝**。闭包、资源以及无法序列化的对象将导致 `ThreadTransferException`。

## 参数

**value**
: 要发送的值。可以是任何可序列化类型（标量、数组或可序列化对象）。

## 错误

- 如果通道已关闭，抛出 `Async\ChannelClosedException`。
- 如果值无法序列化以进行跨线程传输，抛出 `Async\ThreadTransferException`。

## 示例

### 示例 #1 从工作线程发送结果

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### 示例 #2 线程间的无缓冲握手

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // 无缓冲
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // 阻塞直到请求到来
        $responses->send(strtoupper($req));   // 阻塞直到响应被接受
    });

    $requests->send('hello');                 // 阻塞直到服务器调用 recv()
    $reply = $responses->recv();              // 阻塞直到服务器调用 send()
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### 示例 #3 处理已关闭的通道

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Send failed: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## 参见

- [ThreadChannel::recv](/zh/docs/reference/thread-channel/recv.html) — 从通道接收值
- [ThreadChannel::isFull](/zh/docs/reference/thread-channel/is-full.html) — 检查缓冲区是否已满
- [ThreadChannel::close](/zh/docs/reference/thread-channel/close.html) — 关闭通道
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
