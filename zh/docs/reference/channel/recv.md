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
public Channel::recv(?Completable $cancellationToken = null): mixed
```

从通道接收下一个值。这是一个阻塞操作——如果通道中没有可用的值，
当前协程将被挂起。

如果通道已关闭且缓冲区为空，将抛出 `ChannelException`。
如果通道已关闭但缓冲区中仍有值，这些值将被返回。

## 参数

**cancellationToken**
: 取消令牌（`Completable`），允许根据任意条件中断等待。
  `null` — 无限等待（默认）。
  当令牌完成时，操作将被中断并抛出 `CancelledException`。
  如需按时间限制，可使用 `Async\timeout()`。

## 返回值

通道中的下一个值（`mixed`）。

## 错误

- 如果通道已关闭且缓冲区为空，抛出 `Async\ChannelException`。
- 如果取消令牌已完成，抛出 `Async\CancelledException`。

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
            echo "接收到: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "通道已关闭且为空\n";
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
        $value = $channel->recv(Async\timeout(2000));
        echo "接收到: $value\n";
    } catch (\Async\CancelledException) {
        echo "2 秒内未收到数据\n";
    }
});
```

### 示例 #3 使用自定义取消令牌接收

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "接收到: $value\n";
    } catch (\Async\CancelledException) {
        echo "接收已取消\n";
    }
});

// 从另一个协程取消操作
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## 参见

- [Channel::recvAsync](/zh/docs/reference/channel/recv-async.html) — 非阻塞接收
- [Channel::send](/zh/docs/reference/channel/send.html) — 向通道发送值
- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) — 检查缓冲区是否为空
- [Channel::getIterator](/zh/docs/reference/channel/get-iterator.html) — 使用 foreach 迭代通道
