---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "关闭线程通道，表示不再发送新值。"
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

关闭通道。关闭后：

- 调用 `send()` 将抛出 `ChannelClosedException`。
- 调用 `recv()` 继续返回缓冲区中已有的值，直到缓冲区排空。
  一旦缓冲区为空，`recv()` 将抛出 `ChannelClosedException`。
- 当前在 `send()` 或 `recv()` 中阻塞的任何线程都将被解除阻塞，并收到
  `ChannelClosedException`。

在已关闭的通道上调用 `close()` 是空操作 — 不会抛出异常。

`close()` 是向消费侧发出"流结束"信号的标准方式。生产者在发送完所有元素后关闭通道；消费者持续读取直到捕获到 `ChannelClosedException`。

`close()` 本身是线程安全的，可以从任何线程调用。

## 示例

### 示例 #1 生产者发送完所有元素后关闭

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // 发出信号：无更多数据
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream ended\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### 示例 #2 关闭解除等待接收方的阻塞

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // 无缓冲

    // 这个线程将在 recv() 中阻塞等待值
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // 阻塞
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // 从另一个线程关闭通道 — 解除等待者的阻塞
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### 示例 #3 两次调用 close() 是安全的

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // 空操作，不抛出异常

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## 参见

- [ThreadChannel::isClosed](/zh/docs/reference/thread-channel/is-closed.html) — 检查通道是否已关闭
- [ThreadChannel::recv](/zh/docs/reference/thread-channel/recv.html) — 关闭后接收剩余值
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
