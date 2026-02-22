---
layout: docs
lang: zh
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /zh/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "获取迭代器，使用 foreach 遍历通道中的值。"
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

返回用于遍历通道值的迭代器。Channel 实现了
`IteratorAggregate` 接口，因此可以直接使用 `foreach`。

迭代器在等待下一个值时会挂起当前协程。
当通道关闭**且**缓冲区为空时，迭代终止。

> **重要：** 如果通道永远不关闭，`foreach` 将无限期等待新值。

## 返回值

用于遍历通道值的 `\Iterator` 对象。

## 示例

### 示例 #1 使用 foreach 读取通道

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // 没有这个，foreach 将永远不会终止
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    echo "All values processed\n";
});
```

### 示例 #2 生产者-消费者模式

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// 生产者
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// 消费者
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Downloaded: $url ({$response->status})\n";
    }
});
```

## 参见

- [Channel::recv](/zh/docs/reference/channel/recv.html) --- 接收单个值
- [Channel::close](/zh/docs/reference/channel/close.html) --- 关闭通道（终止迭代）
- [Channel::isEmpty](/zh/docs/reference/channel/is-empty.html) --- 检查缓冲区是否为空
