---
layout: docs
lang: zh
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /zh/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "获取通道缓冲区容量。"
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

返回创建通道时通过构造函数设置的容量。

- `0` — 会合通道（无缓冲）。
- 正数 — 最大缓冲区大小。

该值在通道的整个生命周期内不会改变。

## 返回值

通道缓冲区容量（`int`）。

## 示例

### 示例 #1 检查容量

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### 示例 #2 根据通道类型的自适应逻辑

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Rendezvous channel: each send waits for a receiver\n";
    } else {
        echo "Buffered channel: capacity {$ch->capacity()}\n";
        echo "Free: " . ($ch->capacity() - $ch->count()) . " slots\n";
    }
}
```

## 参见

- [Channel::__construct](/zh/docs/reference/channel/construct.html) — 创建通道
- [Channel::count](/zh/docs/reference/channel/count.html) — 缓冲区中的值数量
- [Channel::isFull](/zh/docs/reference/channel/is-full.html) — 检查缓冲区是否已满
