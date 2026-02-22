---
layout: docs
lang: zh
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /zh/docs/reference/channel/send.html
page_title: "Channel::send"
description: "向通道发送值（阻塞操作）。"
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

向通道发送一个值。这是一个阻塞操作——如果通道无法立即接受该值，
当前协程将被挂起。

对于**会合通道**（`capacity = 0`），发送方等待直到另一个协程调用 `recv()`。
对于**有缓冲通道**，发送方仅在缓冲区满时等待。

## 参数

**value**
: 要发送的值。可以是任意类型。

**timeoutMs**
: 最大等待时间（毫秒）。
  `0` — 无限等待（默认）。
  如果超过超时时间，将抛出 `TimeoutException`。

## 错误

- 如果通道已关闭，抛出 `Async\ChannelException`。
- 如果超时时间已过，抛出 `Async\TimeoutException`。

## 示例

### 示例 #1 向通道发送值

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // 放入缓冲区
    $channel->send('second'); // 等待空间释放
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### 示例 #2 带超时的发送

```php
<?php

use Async\Channel;

$channel = new Channel(0); // 会合

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Timeout: no one accepted the value within 1 second\n";
    }
});
```

## 参见

- [Channel::sendAsync](/zh/docs/reference/channel/send-async.html) — 非阻塞发送
- [Channel::recv](/zh/docs/reference/channel/recv.html) — 从通道接收值
- [Channel::isFull](/zh/docs/reference/channel/is-full.html) — 检查缓冲区是否已满
- [Channel::close](/zh/docs/reference/channel/close.html) — 关闭通道
