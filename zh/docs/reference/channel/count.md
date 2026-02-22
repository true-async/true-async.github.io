---
layout: docs
lang: zh
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /zh/docs/reference/channel/count.html
page_title: "Channel::count"
description: "获取通道缓冲区中的值数量。"
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

返回通道缓冲区中当前的值数量。

Channel 实现了 `Countable` 接口，因此可以使用 `count($channel)`。

对于会合通道（`capacity = 0`），始终返回 `0`。

## 返回值

缓冲区中的值数量（`int`）。

## 示例

### 示例 #1 监控缓冲区填充级别

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### 示例 #2 记录通道负载

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Buffer is " . round($usage) . "% full\n";
        delay(1000);
    }
});
```

## 参见

- [Channel::capacity](/zh/docs/reference/channel/capacity.html) --- 通道容量
- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) --- 检查缓冲区是否为空
- [Channel::isFull](/zh/docs/reference/channel/is-full.html) --- 检查缓冲区是否已满
