---
layout: docs
lang: zh
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /zh/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — 一个线程安全的通道，用于在 TrueAsync 中的操作系统线程之间传递数据。"
---

# Async\ThreadChannel：操作系统线程之间的通道

## 与普通 Channel 的区别

`Async\Channel` 在**单一线程内**工作——在同一调度器的协程之间。其数据存储在**线程本地内存**中，安全性由"同一时刻只有一个协程访问通道"来保证。

`Async\ThreadChannel` 专为在**操作系统线程之间**传递数据而设计。通道缓冲区存储在**所有线程均可访问的共享内存**中，而非某个单一线程的内存中。每个发送的值都会被深拷贝到该共享内存，在接收方一侧——再拷贝回线程的本地内存。同步通过线程安全的互斥锁实现，因此 `send()` 和 `recv()` 可以从不同的操作系统线程并发调用。

| 属性                              | `Async\Channel`                        | `Async\ThreadChannel`                        |
|-----------------------------------|----------------------------------------|----------------------------------------------|
| 作用域                            | 单一操作系统线程                       | 操作系统线程之间                             |
| 缓冲数据存储位置                  | 线程本地内存                           | 所有线程可见的共享内存                       |
| 同步方式                          | 协程调度器（协作式）                   | 互斥锁（线程安全）                           |
| 会合模式（capacity=0）            | 支持                                   | 不支持——始终使用缓冲模式                    |
| 最小容量                          | 0                                      | 1                                            |

如果所有逻辑都在单线程中运行——使用 `Async\Channel`，它更轻量。`ThreadChannel` 仅在真正需要操作系统线程之间数据交换时才有意义。

## 创建通道

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — 缓冲区大小（最小为 `1`）。较大的值能更好地吸收突发的生产者写入，但会占用更多内存用于活动队列。

## 基本示例：生产者 + 消费者

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // 生产者——独立的操作系统线程
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // 消费者——在主线程中（一个协程）
    try {
        while (true) {
            $msg = $ch->recv();
            echo "got: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "channel closed\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

生产者从独立线程写入通道；主线程通过 `recv()` 读取——没有什么特别之处，用起来就像普通的 `Channel` 一样。

## send / recv

### `send($value[, $cancellation])`

向通道发送一个值。如果缓冲区已满——**挂起当前协程**（协作式挂起——该调度器中的其他协程继续运行），直到另一个线程释放空间。

该值按照与 `spawn_thread()` 中 `use(...)` 捕获变量相同的规则，被**深拷贝到通道的共享内存**中。具有动态属性的对象、PHP 引用和资源会被拒绝，并抛出 `Async\ThreadTransferException`。

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // 数组
$ch->send(new Point(3, 4));                    // 具有声明属性的对象
$ch->send($futureState);                       // Async\FutureState（一次性！）
```

如果通道已关闭——`send()` 会抛出 `Async\ThreadChannelException`。

### `recv([$cancellation])`

从通道读取一个值。如果缓冲区为空——挂起当前协程，直到数据到来**或**通道关闭。

- 如果数据到来——返回该值。
- 如果通道已关闭且缓冲区为空——抛出 `Async\ThreadChannelException`。
- 如果通道已关闭但缓冲区仍有数据——**先排空剩余数据**，只有在缓冲区清空后才抛出 `ThreadChannelException`。

这使得在通道关闭后能够正确排空通道中的数据。

## 通道状态

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| 方法           | 返回值                                        |
|----------------|-----------------------------------------------|
| `capacity()`   | 构造函数中设置的缓冲区大小                    |
| `count()`      | 缓冲区中当前的消息数量                        |
| `isEmpty()`    | 若缓冲区为空则返回 `true`                     |
| `isFull()`     | 若缓冲区已满则返回 `true`                     |
| `isClosed()`   | 若通道已关闭则返回 `true`                     |

`ThreadChannel` 实现了 `Countable`，因此 `count($ch)` 可以正常使用。

## close()

```php
$ch->close();
```

关闭后：

- `send()` 立即抛出 `Async\ThreadChannelException`。
- `recv()` **排空剩余值**，然后开始抛出 `ThreadChannelException`。
- 所有在 `send()` 或 `recv()` 中挂起的协程/线程都会**被唤醒**，并收到 `ThreadChannelException`。

通道只能关闭一次。重复调用是安全的空操作。

## 模式：工作者池

两个通道——一个用于任务，一个用于结果。工作者线程从第一个通道读取任务，并将结果放入第二个通道。

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 个工作者线程
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // 模拟 CPU 负载
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // jobs 通道已关闭——工作者退出
            }
        });
    }

    // 分发 6 个任务
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // 等待所有工作者线程完成
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // 排空结果
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

每个工作者处理了 2 个任务——负载被分配到三个线程上。

### 关于分配的说明

如果生产者写入通道的速度比工作者读取的速度更快（或者工作者几乎不消耗 CPU 时间），**第一个工作者可能会抢占所有任务**，因为它的 `recv()` 最先被唤醒并在其他工作者到达 `recv()` 之前取走下一条消息。这是并发队列的正常行为——不保证公平调度。

如果需要严格的均匀分配——预先对任务进行分区（按哈希分片），或给每个工作者分配专用通道。

## 通过通道传递复杂数据

`ThreadChannel` 可以携带跨线程数据传输支持的任何内容（参见[在线程之间传递数据](/zh/docs/components/threads.html#passing-data-between-threads)）：

- 标量、数组、具有声明属性的对象
- `Closure`（闭包）
- `WeakReference` 和 `WeakMap`（与 `spawn_thread` 中相同的强引用所有者规则）
- `Async\FutureState`（一次性）

每次 `send()` 调用都是一个独立操作，拥有自己的标识表。**标识在单条消息内保持**，但不跨不同的 `send()` 调用保持。如果你希望两个接收方看到"同一个"对象——将其放入数组中作为一条消息发送，而不是作为两条独立消息。

## 限制

- **最小容量为 1。** 不支持会合模式（capacity=0），与 `Async\Channel` 不同。
- **`ThreadChannel` 不支持序列化。** 通道对象不能保存到文件或通过网络发送——通道只存在于活跃的进程中。
- **通道句柄可以传递**——通过 `spawn_thread` 或嵌套在另一个通道内——`ThreadChannel` 的对象句柄能正确传输，双方都能看到相同的内部缓冲区。

## 另请参阅

- [`Async\Thread`](/zh/docs/components/threads.html) — TrueAsync 中的操作系统线程
- [`spawn_thread()`](/zh/docs/reference/spawn-thread.html) — 在新线程中启动一个闭包
- [`Async\Channel`](/zh/docs/components/channels.html) — 同一线程内协程之间的通道
