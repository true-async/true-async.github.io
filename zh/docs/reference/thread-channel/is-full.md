---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "检查线程通道缓冲区是否已达到最大容量。"
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

如果通道缓冲区已达到最大容量，则返回 `true`。

对于无缓冲通道（`capacity = 0`），此方法始终返回 `true`，因为没有缓冲区 — 每次 `send()` 都必须等待匹配的 `recv()`。

`isFull()` 是线程安全的。结果反映调用时刻的状态；另一个线程随后可能会立即取走一个槽位。

## 返回值

`true` — 缓冲区已达容量（或为无缓冲通道）。
`false` — 缓冲区至少有一个空闲槽位。

## 示例

### 示例 #1 发送前检查缓冲区是否已满

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### 示例 #2 在生产者线程中监控背压

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // 缓冲区当前已满 — send() 将阻塞；
                // 记录背压信息以便可观测
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // 阻塞直到有空间
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // 模拟慢速消费者
                $val = $channel->recv();
                // 处理 $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## 参见

- [ThreadChannel::isEmpty](/zh/docs/reference/thread-channel/is-empty.html) — 检查缓冲区是否为空
- [ThreadChannel::capacity](/zh/docs/reference/thread-channel/capacity.html) — 通道容量
- [ThreadChannel::count](/zh/docs/reference/thread-channel/count.html) — 缓冲区中的值数量
- [ThreadChannel::send](/zh/docs/reference/thread-channel/send.html) — 发送值（满时阻塞）
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
