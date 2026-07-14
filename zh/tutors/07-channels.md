---
layout: tutorial
lang: zh
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /zh/tutors/07-channels.html
page_title: "Channels"
description: "Channel：协程之间的值流、工作池以及背压。"
---

# Channels

`Future` 承诺恰好一个值。但如果有很多值，而且它们是逐渐到达的呢？

回想一下第一章里的那个 CSV 文件。现在任务更严肃了：在导入的同时，
每个用户的地址都需要拿去和 `GeoDirectory` 核对。
我们已经知道如何使用协程了，那就试试直接的做法：

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

这个文件有十万行。这段代码会创建十万个协程，而它们全都会并发地
向 `GeoDirectory` 打开连接。协程很便宜，但连接不便宜。服务会被压垮，
我们的导入也会随之完蛋。

我们真正想要的是：比如说，让十个协程去做核对工作，而其余的地址
排队等待轮到自己。我们需要一个队列，一些协程从中取出工作，
另一些协程往里添加工作。

这样的队列被称为通道（channel）。

## Channel

通道像一根管道一样直接连接协程：

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — 把一个值放进通道。
- **`recv`** — 从通道里取出一个值。

这两个操作都会阻塞，而这正是它的全部意义所在。如果通道是空的，
`recv` 会挂起协程，直到有数据出现。如果通道是满的，那么被挂起的就是
`send`。构造函数里的 `5` 设定了缓冲区大小：在有人取走之前，
通道愿意容纳多少个值。

## 会合（Rendezvous）

如果你创建一个缓冲区为 `0` 的通道会发生什么？它没有地方存放值，
所以 `send` 在另一个协程调用 `recv` 之前不会完成：

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // 仅在 recv 之后运行
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

这样的通道被称为会合（rendezvous）：发送者和接收者被迫在同一个
时间点相遇，名字由此而来。

它和有缓冲通道的区别比看上去更微妙。缓冲意味着“已发送”但不代表
“已接收”：`send` 放下一个值就继续往前走，发送者并不知道它是否、
以及何时被取走。会合则保证了投递：一旦 `send` 返回，值就已经在
接收者手中了。当一个任务不能被丢在队列里等着时，这一点很重要：
例如，只在一个 worker 此刻空闲时才把工作交给它。

数据在这里几乎无关紧要：会合是纯粹的同步。两个协程保证在同一时刻
相遇，即使它们传递的只是一个 `null`。

## 工作池

我们来组装一个导入的解决方案。十个 worker 协程从通道里取出地址，
而主流程读取文件并把内容喂给通道：

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

通道里的每个值都恰好交给一个 worker，即使十个 worker 全都在
`recv` 上等待。值永远不会被复制，所以 worker 之间不会互相踩踏：
通道会自行把工作分配给任何空闲的一方。

无论文件里有多少行，对 `GeoDirectory` 的连接从不会超过十个。
worker 的数量恰好就是并发上限，它由循环里的一个常量设定。

## 背压（Backpressure）

为什么缓冲区恰好是 `100`？设想一下 worker 核对地址的速度比主流程
读取文件的速度慢。没有上限的话，队列会持续增长，直到整个十万行的
文件都塞进内存里。

有了 `100` 的缓冲区，情况就不同了：一旦有一百个地址在通道里堆积，
`send` 就会挂起主流程。文件读取暂停，等 worker 腾出空间后再恢复。
生产者会自动适应消费者的速度。

这个机制被称为背压（backpressure）。请注意，我们并没有自己去
编写它：它是从 `send` 的阻塞本质中自然而然产生的。只要挑一个缓冲区
大小，其余的一切都会自我平衡。

## 关闭通道

文件读完之后，worker 仍然在 `recv` 上等待。这是个熟悉的情形：
在讲取消的那一章里，进度协程也是永远转个不停。但这里我们不需要
在每个 worker 上调用 `cancel()`；通道有一个更精确的工具：

```php
$queue->close();
```

`close` 宣告：不会再有新的值到来了。worker 会先把缓冲区里剩下的
内容读完，然后 `recv` 会抛出 `ChannelException`，结束 `while (true)`
循环。注意这个顺序：关闭不会把工作中途掐断，而是让它妥善地完成。

还有一个熟悉的细节：`recv` 和 `send` 接受与超时那一章里的 `await`
相同的取消令牌：

```php
$address = $queue->recv(timeout(5000));
```

如果五秒钟内通道里什么都没出现，worker 就会收到一个
`AsyncCancellation`，然后它可以，比如说，记录一条警告。

## 传递数据，还是同步？

我们来更仔细地看看在这一章里通道究竟做了什么。
在空通道上的 `recv` 让一个 worker 睡去，直到有工作出现。
在满通道上的 `send` 让文件读取睡去，直到 worker 清空了队列。
会合让两个协程在同一时刻聚到一起。每一个阻塞操作最终都成了一个
协程彼此相互适应的点。

这里值得指出单线程世界的一个微妙之处。就传递数据本身而言，
并不需要通道：协程活在共享内存里，一个对象完全可以通过 `use`
直接交给它们。在单个线程内不会发生数据竞争；两个协程永远不会
在完全相同的一刻执行。通道被用于别的事情：一个有界队列，
把工作分配给空闲的 worker，通过 `close` 发出“没有更多工作了”的信号。

所以把通道这样理解更准确：它是一种同步协程的方式，只不过顺带
搬运了数据，而不是反过来。不过在多线程代码里，协程分散在不同的
线程上，通道在这两种角色上都变得不可或缺：那里没有共享内存，
它仍然是那唯一一座安全的桥梁。

现在我们有了两种把协程连接在一起的方式。`Future` 承诺一个值。
通道搬运一整个值的流，并且顺便为工作设定了一个共享的节奏：
生产者不知道谁会取走数据、何时取走，消费者不知道数据从哪来，
但谁都不会用工作淹没别人。

还剩下一个挥之不去的念头。我们启动了十个 worker 然后就往前走了。
如果其中一个在导入进行到一半时因异常而死掉了呢？到底是谁在看管
这一堆协程？我们将在下一章里弄清楚。
