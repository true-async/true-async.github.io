---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "检查线程通道缓冲区当前是否没有值。"
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

如果通道缓冲区不包含任何值，则返回 `true`。

对于无缓冲通道（`capacity = 0`），此方法始终返回 `true`，因为数据在线程之间直接传输，不经过缓冲。

`isEmpty()` 是线程安全的。结果反映调用时刻的状态；另一个线程随后可能会向通道中放入值。

## 返回值

`true` — 缓冲区为空（没有可用值）。
`false` — 缓冲区至少包含一个值。

## 示例

### 示例 #1 接收前检查是否有缓冲数据

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### 示例 #2 排空已关闭通道的消费者

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // 等待有内容可读，或通道关闭
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // 缓冲区暂时为空 — 让出并重试
                continue;
            }
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

- [ThreadChannel::isFull](/zh/docs/reference/thread-channel/is-full.html) — 检查缓冲区是否已满
- [ThreadChannel::count](/zh/docs/reference/thread-channel/count.html) — 缓冲区中的值数量
- [ThreadChannel::recv](/zh/docs/reference/thread-channel/recv.html) — 接收值
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
