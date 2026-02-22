---
layout: docs
lang: zh
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /zh/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "创建用于协程间数据交换的新通道。"
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

创建一个用于在协程之间传递数据的新通道。

通道是一种同步原语，允许协程安全地交换数据。
通道的行为取决于 `$capacity` 参数：

- **`capacity = 0`** — 会合通道（无缓冲）。`send()` 操作会挂起发送方，
  直到另一个协程调用 `recv()`。这确保了同步数据传输。
- **`capacity > 0`** — 有缓冲通道。只要缓冲区有空间，`send()` 操作就不会阻塞。
  当缓冲区满时，发送方将被挂起，直到有空间可用。

## 参数

**capacity**
: 通道内部缓冲区的容量。
  `0` — 会合通道（默认），发送方阻塞直到接收方接收。
  正数 — 缓冲区大小。

## 示例

### 示例 #1 会合通道（无缓冲）

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // 挂起直到有人调用 recv()
    echo "Sent\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // 接收 'hello'，解除发送方的阻塞
    echo "Received: $value\n";
});
```

### 示例 #2 有缓冲通道

```php
<?php

use Async\Channel;

$channel = new Channel(3); // 3 个元素的缓冲区

spawn(function() use ($channel) {
    $channel->send(1); // 不阻塞 — 缓冲区为空
    $channel->send(2); // 不阻塞 — 有空间
    $channel->send(3); // 不阻塞 — 最后一个位置
    $channel->send(4); // 挂起 — 缓冲区已满
});
```

## 参见

- [Channel::send](/zh/docs/reference/channel/send.html) — 向通道发送值
- [Channel::recv](/zh/docs/reference/channel/recv.html) — 从通道接收值
- [Channel::capacity](/zh/docs/reference/channel/capacity.html) — 获取通道容量
- [Channel::close](/zh/docs/reference/channel/close.html) — 关闭通道
