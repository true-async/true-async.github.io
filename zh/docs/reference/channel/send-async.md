---
layout: docs
lang: zh
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /zh/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "非阻塞方式向通道发送值。"
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

执行非阻塞的通道发送尝试。
与 `send()` 不同，此方法**永远不会挂起**协程。

如果值成功发送（放入缓冲区或交付给等待的接收方），返回 `true`。
如果缓冲区已满或通道已关闭，返回 `false`。

## 参数

**value**
: 要发送的值。可以是任意类型。

## 返回值

`true` — 值已成功发送。
`false` — 通道已满或已关闭，值未被发送。

## 示例

### 示例 #1 尝试非阻塞发送

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — 缓冲区为空
$channel->sendAsync('b'); // true — 有空间
$result = $channel->sendAsync('c'); // false — 缓冲区已满

echo $result ? "Sent" : "Channel full"; // "Channel full"
```

### 示例 #2 带可用性检查的发送

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // 缓冲区已满 — 回退到阻塞发送
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## 参见

- [Channel::send](/zh/docs/reference/channel/send.html) — 阻塞发送
- [Channel::isFull](/zh/docs/reference/channel/is-full.html) — 检查缓冲区是否已满
- [Channel::isClosed](/zh/docs/reference/channel/is-closed.html) — 检查通道是否已关闭
