---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "从线程通道接收下一个值，如果没有可用值则阻塞调用线程。"
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

从通道接收下一个值。这是一个**阻塞**操作 — 如果通道中当前没有可用值，调用线程将被阻塞。

- 对于**有缓冲通道**，如果缓冲区中至少有一个值，`recv()` 立即返回。
  如果缓冲区为空，线程阻塞直到发送方放入值。
- 对于**无缓冲通道**（`capacity = 0`），`recv()` 阻塞直到另一个线程调用 `send()`。

如果通道已关闭且缓冲区仍有值，这些值将正常返回。
一旦缓冲区排空且通道已关闭，`recv()` 将抛出 `ChannelClosedException`。

接收到的值是原始值的**深拷贝** — 对返回值的修改不会影响发送方的副本。

## 返回值

通道中的下一个值（`mixed`）。

## 错误

- 如果通道已关闭且缓冲区为空，抛出 `Async\ChannelClosedException`。

## 示例

### 示例 #1 接收工作线程产生的值

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
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // 接收所有值 — 缓冲区为空时阻塞
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "All values received\n";
    }

    await($worker);
});
```

### 示例 #2 消费者线程排空共享通道

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // 生产者：从一个线程填充通道
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // 消费者：从另一个线程排空通道
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // 缓冲区已排空且通道已关闭
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### 示例 #3 从无缓冲通道接收

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // 无缓冲

    $sender = spawn_thread(function() use ($channel) {
        // 在这里阻塞，直到主线程调用 recv()
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // 主协程（线程）调用 recv() — 解除发送方的阻塞
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## 参见

- [ThreadChannel::send](/zh/docs/reference/thread-channel/send.html) — 向通道发送值
- [ThreadChannel::isEmpty](/zh/docs/reference/thread-channel/is-empty.html) — 检查缓冲区是否为空
- [ThreadChannel::close](/zh/docs/reference/thread-channel/close.html) — 关闭通道
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
