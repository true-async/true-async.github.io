---
layout: tutorial
lang: zh
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /zh/tutors/14-threads.html
page_title: "线程"
description: "spawn_thread 与 ThreadPool：面向计算的真正并行、隔离与数据拷贝。"
---

# 线程

至此我们所有的工具都生活在单个操作系统线程之内。协程营造出多件事情在同时发生的印象，但在任何给定时刻，实际上
恰好只有其中一个在执行。对于导入任务和向 `GeoDirectory` 发出的请求来说，这绰绰有余：这些任务大多在等待，而
等待可以被完美地分割。

现在来看一种不同类型的任务。每天一次，`ProfileService` 构建一份年度报告：整整一分钟的纯计算，没有一次网络或
数据库调用。让我们把它放在一个协程里运行，和我们熟悉的滴答计时器一起：

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // 一分钟的纯计算
    echo "report ready\n";
});
```

计时器整整一分钟哑然无声。回想第一章：协程在 await 点切换，在 `sleep`、`delay`、I/O 处切换。但
`buildYearlyReport` 没有一个 await 点，只有循环和算术。调度器再也拿不回控制权，整个进程，计时器、工作者、
请求处理，全都干坐在那儿看着一个协程埋头算数。

协程给你的是并发，而非并行。当一个任务受制于 CPU 而非等待时，你就需要第二个处理器。或者更准确地说，第二个
操作系统线程。

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` 在一个独立的操作系统线程里、在另一个 CPU 核心上启动这个闭包。报告现在是真正地被并行计算出来的：
计时器继续滴答，工作者继续工作，而调度器完全不知道就在隔壁正发生着繁重的工作。

从外面看，线程几乎就像一个协程：你可以把它传给那个熟悉的 `await`，它只会挂起正在等待的那个协程。来自线程的异常
也会抵达 `await`，被包裹在 `Async\RemoteException` 里。

## 毫无共同之处

几乎就像一个协程，但有一个根本性的区别。在通道那一章我们说过，协程生活在共享内存里，你可以直接通过 `use` 交出
一个对象，而在单个线程之内不会发生数据竞争。然而，这个招数对线程不起作用。每个线程都有自己的 PHP 环境：自己的
变量、自己的类、自己的静态属性。根本就没有共享内存。

这就是为什么传入线程的一切都会被完整拷贝：

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // 这是 $rows 的一份拷贝：这里的改动在外面不可见
    return buildYearlyReport($rows);
});
```

这条规则也带来了限制：你不能把一个 PHP 引用（`&$var`）、一个像已打开文件那样的资源，或者一个带有动态属性的
对象传入线程。试图这样做会立即在一开始就抛出 `ThreadTransferException`，而不是在之后引发神秘的行为。

规则很严格，但它们很诚实：既然没有共享状态，就没有竞争、锁、互斥量，或者经典多线程中的任何其他噩梦。TrueAsync
的线程以和协程相同的方式通信：通过传递值，而非通过共享内存。

顺便说一句，有一位老熟人懂得如何有意义地跨越线程边界。第六章的 `FutureState` 可以被传入一个线程，而它的
`Future` 则留在原地：

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

生产者在一个线程里，消费者在另一个线程里，而契约完全相同。这正是当初 `Future` 被拆分成两个独立对象的原因：
它们之间的边界结果证明足够坚固，可以让一条线程边界正好沿着它铺展开来。

## ThreadPool

线程是一个昂贵的实体：它自己的 PHP 环境必须被创建、初始化并预热。一分钟一个任务，当然没问题，但为每个微小的
任务都启动一个线程，就和为每次请求都打开一个数据库连接一样浪费。

对于昂贵的资源该怎么做，你已经知道了。没错，把它们池化：

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

八个工作者线程被一次性创建出来，并和池活得一样久。`submit` 把一个任务放进队列，一个空闲的工作者取走它并返回
结果。看看 `submit` 返回的是什么：一个 `Future`，一个由别人来产出的结果的承诺。在第六章里那个“别人”是一个
协程；现在它是一整个独立的线程，而契约丝毫没有改变。

池的队列有一个上限，一旦它填满，`submit` 就会挂起调用它的协程。认出来了吗？这就是通道那一章里的背压：任务
的生产者会自动调整自己的节奏，去匹配工作者的速度。

让工作者的数量接近 CPU 核心的数量：和等待不同，计算需要真实的物理核心，八个核心上开二十个线程只会彼此推搡、
互相碍事。默认情况下，在不带 `workers` 参数时，池会自行算出可用的并行度，甚至会把容器配额也考虑进去。

而对于最常见的情形，“并行地处理一个列表”，有一个你已经从 `iterate` 那里认识的一行式写法：

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` 把元素分发给各个工作者，等待它们全部完成，并按原始顺序返回结果。

于是结果表明，并发有两个维度。协程压缩等待：成千上万的任务共享单个线程，并在等待时互不妨碍。线程增添真正的
并行：计算铺展到各个 CPU 核心上。这些工具彼此并不竞争，而是彼此互补：代码在哪里等待，就取用一个协程；在哪里
计算，就取用一个线程；而一旦你有了大量的其中任意一种，池就前来救援。

最后，看看我们的进程已经变成了什么样子：数百个协程，全都混在一起，服务着不同的用户，任务在工作者和线程之间
蹦来蹦去。而在那片人群之中，一个简单的问题竟意外地变得棘手：你把“当前那个”存放在哪里？当前用户、当前语言、
请求 ID？只有一个全局变量供所有人共用，而协程却有成千上万个。这正是最后一章要讲的。
