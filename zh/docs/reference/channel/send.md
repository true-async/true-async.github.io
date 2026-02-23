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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

向通道发送一个值。这是一个阻塞操作——如果通道无法立即接受该值，
当前协程将被挂起。

对于**会合通道**（`capacity = 0`），发送方等待直到另一个协程调用 `recv()`。
对于**有缓冲通道**，发送方仅在缓冲区满时等待。

## 参数

**value**
: 要发送的值。可以是任意类型。

**cancellationToken**
: 取消令牌（`Completable`），允许根据任意条件中断等待。
  `null` — 无限等待（默认）。
  当令牌完成时，操作将被中断并抛出 `CancelledException`。
  如需按时间限制，可使用 `Async\timeout()`。

## 错误

- 如果通道已关闭，抛出 `Async\ChannelException`。
- 如果取消令牌已完成，抛出 `Async\CancelledException`。

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
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "超时：1 秒内没有人接受该值\n";
    }
});
```

### 示例 #3 使用自定义取消令牌发送

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('data', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "发送已取消\n";
    }
});

// 从另一个协程取消操作
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## 参见

- [Channel::sendAsync](/zh/docs/reference/channel/send-async.html) — 非阻塞发送
- [Channel::recv](/zh/docs/reference/channel/recv.html) — 从通道接收值
- [Channel::isFull](/zh/docs/reference/channel/is-full.html) — 检查缓冲区是否已满
- [Channel::close](/zh/docs/reference/channel/close.html) — 关闭通道
