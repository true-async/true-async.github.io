---
layout: tutorial
lang: zh
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /zh/tutors/08-scope.html
page_title: "Scope"
description: "Scope：谁拥有协程、等待它们完成，以及取消整个组。"
---

# Scope

在上一章里，我们启动了十个 worker 并关闭了通道。文件读完了，
`close()` 已经调用，主流程也往前走了。但是等一下：
worker 仍在处理缓冲区里的内容。导入函数已经交还了控制权，
而工作还没做完。如果 PHP 脚本此刻就结束，一些地址将得不到核对。

还有那同一章里的第二个担忧：如果一个 worker 内部的 `checkAddress`
抛出了异常呢？从讲异常的那一章我们知道，它会被存放在协程的句柄里，
等待一个 `await`。但没有人打算去 `await` 这些 worker。错误会在
最末尾才浮现出来，那时已经太晚，什么都补救不了了。

这两个问题都可以手动解决：把协程收进一个数组，然后逐个等待。

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... 读取文件 ...

foreach ($workers as $worker) {
    await($worker);
}
```

它能用。但这是繁琐的记账活儿：你得记着建好数组，把它贯穿整个
代码路径带下去，最后再遍历它。而且如果某个协程是在被调用函数的
深处某个地方启动的，它甚至根本进不了那个数组。我们想要的是，
让协程自己知道它们属于谁。

这正是 `Scope` 的用途。

## 协程的沙盒

`Scope` 是协程生活于其中的一片空间。它知道在它内部启动的每一个
协程，并且能把它们当作一个组来处理：

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        try {
            while (true) {
                checkAddress($queue->recv());
            }
        } catch (ChannelException) {
            // 通道已关闭且为空
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

与上一章的区别在于两行：用 `$workers->spawn()` 代替 `spawn()`，
以及在末尾的 `awaitCompletion()`。`awaitCompletion` 方法会一直等到
scope 中的每一个协程都完成，无论有多少个。没有数组，没有记账：
scope 会自己记录。

这里的取消令牌不是可选的，而是一个必需的参数：scope 特意不允许你
在没有边界的情况下等待一个组。我们熟悉的 `timeout` 正好合适，
如果导入在一分钟内没有完成，等待就会被 `OperationCanceledException`
中断，接下来由你来决定：再多等一会儿，还是取消这个组。

## 错误不再丢失

我们回到那个崩溃的 worker。scope 内部的协程无法悄无声息地死去：
一个未处理的异常会向上冒泡到父 scope。默认情况下，scope 的反应
很严格：一个协程里的错误会取消其余所有协程，而异常会被投递给
在 `awaitCompletion` 中等待的那一方。

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

这个策略叫做 fail-together（共同失败）：这个组要么作为整体完成，
要么作为整体停止。对于导入来说，这是合理的：如果 `GeoDirectory`
宕机了，用剩下的九个 worker 去轰炸它毫无意义。

但严格并不总是你想要的。文件里一个坏地址不足以成为放弃其余
九万九千个的理由。这种情况下，你给 scope 指派一个错误处理器，
于是协程变得彼此独立：失败的那个被记录下来，其余的继续工作：

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

除了异常本身，处理器还会收到 scope 和失败的协程：这对于弄清楚到底
是谁死掉了，或者重启工作，都很方便。

策略的选择权在你手里，而这正是它与朴素的 `spawn` 的主要区别：
在 `spawn` 那里，唯一的策略是“发射后不管”。

## 取消整个组

在讲取消的那一章里，我们用 `cancel()` 停止了单个协程。
scope 对整个组一次性做同样的事：

```php
$workers->cancel();
```

内部的每一个协程都会在它自己的等待点收到我们熟悉的
`AsyncCancellation`：有的在 `recv`，有的在 `delay`。机制是一样的，
协作式的，只不过信号一次性发给了所有人。

一个 scope 可以包含子 scope，而取消会沿着层级递归向下流动：
取消父 scope，整条分支都会被取消。协程不再是一堆散乱的独立任务，
而是形成一棵树，其中每一个都有自己的位置和拥有者。这种方法被称为
结构化并发（structured concurrency），它已经在 Kotlin、Swift 和
Java 中证明了自己。TrueAsync 把它带到了 PHP。

## scope 归属于某个对象

scope 最优雅的用法：把它的所有权交给一个对象。

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* worker 和文件读取 */);
        $this->scope->spawn(/* 第一章里的进度协程 */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

现在协程的生命周期与服务的生命周期相匹配。只要对象存在，
它的协程就持续工作。销毁对象，`dispose()` 就会取消它所启动的一切。

还记得第一章里的 `$progress->cancel()` 吗？我们当时手动捕捉了
进度协程变得不再需要的那一刻。有了 scope，这个问题就直接消失了：
进度在导入运行期间都需要，而导入的运行时长恰好和 `ImportService`
的存活时长一致。所有权直接表达在了代码里，而且再也没有地方可以
忘掉一个协程了。

## 完整的导入，从头到尾

我们把八章下来积累的一切拼装进一个可运行的类里：第一章里的
协程和进度，第七章里那个感知背压的通道，还有本章的 scope。

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Worker：从通道里取出地址，并发数不超过 $this->workers
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                try {
                    while (true) {
                        checkAddress($queue->recv());
                        $counter++;
                    }
                } catch (ChannelException) {
                    // 通道已关闭且为空，工作已完成
                }
            });
        }

        // 进度：每秒渲染一次状态，直到导入完成
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // 生产者：读取文件，通道的背压保护内存
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // 等待一切：worker 和进度协程都要等
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

有几个细节值得仔细看看。进度不再是一个无限循环：条件
`while ($counter < $total)` 会在最后一个地址处理完之后协作式地
结束它，所以 `awaitCompletion` 无需任何一个 `cancel` 就能等待一切。
而析构函数里的 `dispose()` 在正常运行中完全不起作用：它是一张
安全网，用于导入抛出异常、或者对象在进行到一半时被丢弃的情况。

这就是 scope 的要点。`spawn` 只回答“我如何开始并发工作”这个问题。
scope 处理紧随其后的那些问题：谁来等待这份工作，谁来得知错误，
以及谁来停止它。没有 scope，协程只能自生自灭；在 scope 内部，
它就有了一个拥有者，也在程序的结构中有了一席之地。

到目前为止，worker 一直只是在从外部世界读取。但核对过的地址
仍然需要保存到数据库里。我们能不能就直接把一个 `PDO` 对象交给
十个协程？这是个开启下一章的好问题。
