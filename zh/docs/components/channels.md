---
layout: docs
lang: zh
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /zh/docs/components/channels.html
page_title: "通道"
description: "TrueAsync 中的通道 -- 协程之间安全的数据传输、任务队列和背压。"
---

# 通道

通道在多线程环境中比在单线程环境中更有用。它们用于在一个协程到另一个协程之间安全地传输数据。
如果需要修改共享数据，在单线程环境中，将对象传递给不同的协程比创建通道更简单。

但是，通道在以下场景中很有用：
* 组织带限制的任务队列
* 组织对象池（建议使用专用的 `Async\Pool` 原语）
* 同步

例如，有很多 URL 需要爬取，但同时连接数不超过 N 个：

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Fetched page {$url}, length: " . strlen($content) . "\n";
        }
    });
}

// 向通道填充值
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

此示例中的 `MAX_QUEUE` 常量充当生产者的限制器，产生背压 --
即生产者在消费者释放通道空间之前无法发送数据的情况。

## 无缓冲通道（会合）

缓冲区大小为 `0` 的通道以会合模式工作：`send()` 会阻塞直到另一个协程调用 `recv()`，反之亦然。这确保了严格的同步：

```php
use Async\Channel;

$ch = new Channel(0); // 会合通道

spawn(function() use ($ch) {
    echo "Sender: before send\n";
    $ch->send("hello");
    echo "Sender: send completed\n"; // 仅在 recv() 之后
});

spawn(function() use ($ch) {
    echo "Receiver: before recv\n";
    $value = $ch->recv();
    echo "Receiver: got $value\n";
});
```

## 操作超时

`recv()` 和 `send()` 方法接受一个可选的超时参数（毫秒）。当时间到期时，抛出 `TimeoutException`：

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // 最多等待 50 毫秒
    } catch (TimeoutException $e) {
        echo "Nobody sent data within 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // 最多等待接收者 50 毫秒
    } catch (TimeoutException $e) {
        echo "Nobody received the data within 50 ms\n";
    }
});
```

## 竞争接收者

如果多个协程在同一个通道上等待 `recv()`，每个值只会被其中**一个**协程接收。值不会被复制：

```php
use Async\Channel;

$ch = new Channel(0);

// 发送者
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// 接收者 A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 接收者 B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 每个值（1, 2, 3）只会被 A 或 B 接收，但不会被两者同时接收
```

这种模式对于实现工作者池很有用，多个协程从共享队列中竞争获取任务。
