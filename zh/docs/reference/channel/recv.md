---
layout: docs
lang: zh
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /zh/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "从通道接收值（阻塞操作）。"
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(int $timeoutMs = 0): mixed
```

从通道接收下一个值。这是一个阻塞操作——如果通道中没有可用的值，
当前协程将被挂起。

如果通道已关闭且缓冲区为空，将抛出 `ChannelException`。
如果通道已关闭但缓冲区中仍有值，这些值将被返回。

## 参数

**timeoutMs**
: 最大等待时间（毫秒）。
  `0` — 无限等待（默认）。
  如果超过超时时间，将抛出 `TimeoutException`。

## 返回值

通道中的下一个值（`mixed`）。

## 错误

- 如果通道已关闭且缓冲区为空，抛出 `Async\ChannelException`。
- 如果超时时间已过，抛出 `Async\TimeoutException`。

## 示例

### 示例 #1 从通道接收值

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Received: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Channel closed and empty\n";
    }
});
```

### 示例 #2 带超时的接收

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(timeoutMs: 2000);
        echo "Received: $value\n";
    } catch (\Async\TimeoutException) {
        echo "No data received within 2 seconds\n";
    }
});
```

## 参见

- [Channel::recvAsync](/zh/docs/reference/channel/recv-async.html) — 非阻塞接收
- [Channel::send](/zh/docs/reference/channel/send.html) — 向通道发送值
- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) — 检查缓冲区是否为空
- [Channel::getIterator](/zh/docs/reference/channel/get-iterator.html) — 使用 foreach 迭代通道
