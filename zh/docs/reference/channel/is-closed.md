---
layout: docs
lang: zh
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "检查通道是否已关闭。"
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

检查通道是否已被 `close()` 调用关闭。

已关闭的通道不再通过 `send()` 接受新值，但允许
通过 `recv()` 读取缓冲区中剩余的值。

## 返回值

`true` — 通道已关闭。
`false` — 通道处于打开状态。

## 示例

### 示例 #1 检查通道状态

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "closed" : "open"; // "open"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "closed" : "open"; // "closed"

// 关闭后仍然可以读取缓冲区
$value = $channel->recv(); // "data"
```

### 示例 #2 条件发送

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Channel closed, stopping sends\n";
});
```

## 参见

- [Channel::close](/zh/docs/reference/channel/close.html) — 关闭通道
- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) — 检查缓冲区是否为空
