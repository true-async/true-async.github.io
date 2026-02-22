---
layout: docs
lang: zh
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /zh/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "从通道非阻塞接收值，返回 Future。"
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

对通道执行非阻塞接收操作，并返回一个 `Future` 对象，
可以在之后进行等待。

与 `recv()` 不同，此方法**不会立即挂起**当前协程。
而是返回一个 `Future`，当值可用时将被解析。

## 返回值

一个 `Future` 对象，将解析为从通道接收到的值。

## 示例

### 示例 #1 非阻塞接收

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // 可以在尚不需要数据时执行其他工作
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### 示例 #2 从多个通道并行接收

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // 等待任一通道中第一个可用的值
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Received from channel #$index: $result\n";
});
```

## 参见

- [Channel::recv](/zh/docs/reference/channel/recv.html) — 阻塞接收
- [Channel::sendAsync](/zh/docs/reference/channel/send-async.html) — 非阻塞发送
- [await](/zh/docs/reference/await.html) — 等待 Future
