---
layout: docs
lang: zh
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /zh/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "获取线程通道的缓冲区容量。"
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

返回构造时设置的通道容量。

- `0` — 无缓冲（同步）通道：`send()` 阻塞直到接收方准备好。
- 正数 — 缓冲区可同时容纳的最大值数量。

容量在通道的整个生命周期内固定不变。

## 返回值

通道缓冲区容量（`int`）。

## 示例

### 示例 #1 检查容量

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### 示例 #2 基于通道类型的自适应逻辑

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Unbuffered: each send() blocks until recv() is called\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Buffered: capacity {$ch->capacity()}, {$free} slot(s) free\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Buffered: capacity 8, 7 slot(s) free"
```

## 参见

- [ThreadChannel::__construct](/zh/docs/reference/thread-channel/__construct.html) — 创建通道
- [ThreadChannel::count](/zh/docs/reference/thread-channel/count.html) — 当前缓冲的值数量
- [ThreadChannel::isFull](/zh/docs/reference/thread-channel/is-full.html) — 检查缓冲区是否已满
- [ThreadChannel 组件概述](/zh/docs/components/thread-channels.html)
