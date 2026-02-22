---
layout: docs
lang: zh
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /zh/docs/reference/channel/close.html
page_title: "Channel::close"
description: "关闭通道，禁止继续发送数据。"
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

关闭通道。关闭后：

- 调用 `send()` 将抛出 `ChannelException`。
- 调用 `recv()` 将继续返回缓冲区中的值，直到缓冲区为空。
  之后，`recv()` 将抛出 `ChannelException`。
- 所有在 `send()` 或 `recv()` 中等待的协程将收到 `ChannelException`。
- 通过 `foreach` 进行的迭代将在缓冲区为空时终止。

对已关闭的通道再次调用 `close()` 不会导致错误。

## 示例

### 示例 #1 发送数据后关闭通道

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // 通知接收方不再有数据
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    // foreach 在关闭并排空缓冲区后终止
    echo "Channel exhausted\n";
});
```

### 示例 #2 处理等待协程的关闭

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // 等待接收方
    } catch (\Async\ChannelException $e) {
        echo "Channel closed: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // 短暂延迟
    $channel->close(); // 以异常方式解除发送方的阻塞
});
```

## 参见

- [Channel::isClosed](/zh/docs/reference/channel/is-closed.html) — 检查通道是否已关闭
- [Channel::recv](/zh/docs/reference/channel/recv.html) — 接收值（排空缓冲区）
- [Channel::getIterator](/zh/docs/reference/channel/get-iterator.html) — 迭代直到关闭
