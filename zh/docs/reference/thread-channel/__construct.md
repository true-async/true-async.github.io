---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "创建一个新的线程安全通道，用于在操作系统线程之间交换数据。"
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

创建一个新的线程安全通道，用于在操作系统线程之间传递数据。

`ThreadChannel` 是 [`Channel`](/zh/docs/components/channels.html) 的跨线程对应物。
`Channel` 专为在单个线程内的协程之间通信而设计，
而 `ThreadChannel` 允许数据在**独立的操作系统线程**之间安全流动 — 例如，在主线程与通过 `spawn_thread()` 启动或提交到 `ThreadPool` 的工作线程之间。

通道的行为取决于 `$capacity` 参数：

- **`capacity = 0`** — 无缓冲（同步）通道。`send()` 会阻塞调用线程，
  直到另一个线程调用 `recv()`。这保证了在发送方继续之前接收方已准备好。
- **`capacity > 0`** — 有缓冲通道。只要缓冲区有空间，`send()` 就不会阻塞。
  当缓冲区已满时，调用线程会阻塞直到有空间可用。

通过通道传输的所有值都会被**深拷贝** — 适用与 `spawn_thread()` 相同的序列化规则。无法序列化的对象（例如闭包、资源、带引用的 `stdClass`）将导致 `ThreadTransferException`。

## 参数

**capacity**
: 通道内部缓冲区的容量。
  `0` — 无缓冲通道（默认），`send()` 阻塞直到接收方准备好。
  正数 — 缓冲区大小；仅当缓冲区已满时 `send()` 才阻塞。

## 示例

### 示例 #1 线程间的无缓冲通道

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // 阻塞直到主线程发送
        return "Worker received: $value";
    });

    $channel->send('hello'); // 阻塞直到工作线程调用 recv()
    echo await($thread), "\n";
});
```

### 示例 #2 线程间的有缓冲通道

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // 可缓冲 10 个元素

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // 在缓冲区满之前不会阻塞
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## 参见

- [ThreadChannel::send](/zh/docs/reference/thread-channel/send.html) — 向通道发送值
- [ThreadChannel::recv](/zh/docs/reference/thread-channel/recv.html) — 从通道接收值
- [ThreadChannel::capacity](/zh/docs/reference/thread-channel/capacity.html) — 获取通道容量
- [ThreadChannel::close](/zh/docs/reference/thread-channel/close.html) — 关闭通道
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
