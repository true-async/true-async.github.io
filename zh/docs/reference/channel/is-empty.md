---
layout: docs
lang: zh
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /zh/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "检查通道缓冲区是否为空。"
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

检查通道缓冲区是否为空（没有可接收的值）。

对于会合通道（`capacity = 0`），始终返回 `true`，
因为数据是直接传输的，不经过缓冲。

## 返回值

`true` — 缓冲区为空。
`false` — 缓冲区中有值。

## 示例

### 示例 #1 检查是否有可用数据

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"
```

### 示例 #2 批量数据处理

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // 等待数据到达
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## 参见

- [Channel::isFull](/zh/docs/reference/channel/is-full.html) --- 检查缓冲区是否已满
- [Channel::count](/zh/docs/reference/channel/count.html) --- 缓冲区中的值数量
- [Channel::recv](/zh/docs/reference/channel/recv.html) --- 接收值
