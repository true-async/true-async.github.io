---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "获取当前缓冲在线程通道中的值数量。"
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

返回通道缓冲区中当前持有的值数量。

`ThreadChannel` 实现了 `Countable` 接口，因此也可以使用 `count($channel)`。

对于无缓冲通道（`capacity = 0`），此方法始终返回 `0` — 值在线程之间直接传输，不经过缓冲。

计数以原子方式读取，即使其他线程并发地发送或接收，在调用时也是准确的。

## 返回值

缓冲区中当前的值数量（`int`）。

## 示例

### 示例 #1 监控缓冲区填充程度

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — Countable 接口

$channel->recv();
echo $channel->count();   // 2
```

### 示例 #2 从监控线程记录通道负载

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // 监控线程：定期记录缓冲区使用情况
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // 在真实线程中可以使用 sleep() 或信号量
        }
    });

    // ... 生产者和消费者线程 ...

    $tasks->close();
    await($monitor);
});
```

## 参见

- [ThreadChannel::capacity](/zh/docs/reference/thread-channel/capacity.html) — 通道容量
- [ThreadChannel::isEmpty](/zh/docs/reference/thread-channel/is-empty.html) — 检查缓冲区是否为空
- [ThreadChannel::isFull](/zh/docs/reference/thread-channel/is-full.html) — 检查缓冲区是否已满
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
