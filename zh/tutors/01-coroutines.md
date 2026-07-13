---
layout: tutorial
lang: zh
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /zh/tutors/01-coroutines.html
page_title: "协程"
description: "初识协程：spawn() 与并发执行。"
---

# 创建协程

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

`counter` 函数会把一个计数器打印到屏幕上，每次打印之间暂停一秒：

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

每次调用 `sleep` 时，PHP 线程都会休眠指定的时长。
在这段时间里它实际上什么都没做。
这个 PHP 脚本会运行 5 秒，恰好等于函数自身等待的时长。

如果我们把 `counter` 函数放到协程里运行，会发生什么呢？

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

现在输出会交替出现：
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

脚本的总运行时间仍然大约是 5 秒，然而脚本现在表现得就像在“并发”运行两个函数。
那么，实际上到底发生了什么？

`spawn` 创建了第二条逻辑控制流“B”，`counter` 函数就在其中运行。
当线程“A”执行到 `sleep` 时，它不会阻塞整个 PHP，而是把控制权交给另一条逻辑线程“B”。以此类推：

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## 有什么好处？

设想 `counter` 函数是执行 I/O 操作和定时器工作（`sleep`）的普通顺序代码。
I/O 操作由操作系统内核处理，因此 PHP 代码必须等待它们完成。
在等待期间，PHP 本可以去做别的事情。
协程让你能用有用的工作来填补这段等待时间，而无需创建独立的进程、线程、同步机制、数据竞争，以及并行编程中那许许多多的噩梦。

我们来看一个实际的例子：

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

`processUsers` 函数读取一个 CSV 文件并逐行处理。
文件很大，没必要把每一行都打印到屏幕上，但能看到进度会很不错。
我们可以在每次迭代时都重绘进度条，但那会损害处理性能。
我们也可以每 100 次迭代重绘一次，但不同的行处理起来所需的时间各不相同。
那我们如何以大致均匀的间隔平滑地显示进度呢？

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

这可以通过 `$progress` 协程来实现，它每秒显示一次当前进度。
它依赖于 `$counter` 变量，该变量在 `processUsers` 函数内部被递增，并按引用传入协程。

```bash
[====>                         ] 15%
```

这个方案的精妙之处在于：`printProgress` 对 `processUsers` 一无所知，反之亦然。
它们互不依赖，却又协同工作。

换句话说，协程不仅创造了并发执行的假象，还帮助分离了关注点。

你注意到 `$progress->cancel()` 了吗？它究竟是用来做什么的？
