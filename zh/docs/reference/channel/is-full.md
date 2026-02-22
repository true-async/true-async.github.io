---
layout: docs
lang: zh
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /zh/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "检查通道缓冲区是否已满。"
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

检查通道缓冲区是否已达到最大容量。

对于会合通道（`capacity = 0`），始终返回 `true`，
因为没有缓冲区。

## 返回值

`true` — 缓冲区已满（或者是会合通道）。
`false` — 缓冲区有可用空间。

## 示例

### 示例 #1 检查缓冲区是否满

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### 示例 #2 自适应发送速率

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Buffer full, slowing down processing\n";
        }
        $channel->send($line); // 如果满则挂起
    }
    $channel->close();
});
```

## 参见

- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) --- 检查缓冲区是否为空
- [Channel::capacity](/zh/docs/reference/channel/capacity.html) --- 通道容量
- [Channel::count](/zh/docs/reference/channel/count.html) --- 缓冲区中的值数量
- [Channel::sendAsync](/zh/docs/reference/channel/send-async.html) --- 非阻塞发送
