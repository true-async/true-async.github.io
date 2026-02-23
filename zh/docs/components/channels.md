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
    echo "发送方: send 之前\n";
    $ch->send("hello");
    echo "发送方: send 完成\n"; // 仅在 recv() 之后
});

spawn(function() use ($ch) {
    echo "接收方: recv 之前\n";
    $value = $ch->recv();
    echo "接收方: 收到 $value\n";
});
```

## 取消操作

`recv()` 和 `send()` 方法接受一个可选的取消令牌（`Completable`），允许根据任意条件中断等待。这比固定超时更加灵活——可以从另一个协程、通过信号、通过事件或按时间取消操作：

```php
use Async\Channel;
use Async\CancelledException;

$ch = new Channel(0);

// 按超时取消
spawn(function() use ($ch) {
    try {
        $ch->recv(Async\timeout(50)); // 最多等待 50 毫秒
    } catch (CancelledException $e) {
        echo "50 毫秒内没有人发送数据\n";
    }
});

// 按自定义条件取消
spawn(function() use ($ch) {
    $cancel = new \Async\Future();

    spawn(function() use ($cancel) {
        // 50 毫秒后取消
        Async\delay(50);
        $cancel->complete(null);
    });

    try {
        $ch->send("data", $cancel);
    } catch (CancelledException $e) {
        echo "没有人接收数据——操作已取消\n";
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
            echo "A 接收到: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 接收者 B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B 接收到: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 每个值（1, 2, 3）只会被 A 或 B 接收，但不会被两者同时接收
```

这种模式对于实现工作者池很有用，多个协程从共享队列中竞争获取任务。
