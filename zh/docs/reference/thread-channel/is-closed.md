---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "检查线程通道是否已关闭。"
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

如果通道已通过 `close()` 关闭，则返回 `true`。

已关闭的通道不接受通过 `send()` 传入的新值，但 `recv()` 仍会继续返回缓冲区中的剩余值，直到缓冲区排空。

`isClosed()` 是线程安全的，可以从任何线程无需同步地调用。

## 返回值

`true` — 通道已关闭。
`false` — 通道已打开。

## 示例

### 示例 #1 从主线程检查通道状态

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // 关闭前缓冲的值仍可读取
    echo $channel->recv(), "\n"; // "data"
});
```

### 示例 #2 由 isClosed() 保护的消费者循环

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // 持续读取直到通道关闭且缓冲区为空
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## 参见

- [ThreadChannel::close](/zh/docs/reference/thread-channel/close.html) — 关闭通道
- [ThreadChannel::isEmpty](/zh/docs/reference/thread-channel/is-empty.html) — 检查缓冲区是否为空
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
