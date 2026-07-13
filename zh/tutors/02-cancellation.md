---
layout: tutorial
lang: zh
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /zh/tutors/02-cancellation.html
page_title: "取消"
description: "cancel() 如何工作，以及协作式的协程取消。"
---

# 取消

在前面的例子中，有一个有趣的 `cancel` 函数调用，
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

如果我们把它删掉会怎样？你可以自己试试。
`$progress` 协程会在一个带 1 秒延迟的无限循环中不停打转。
当 `processUsers` 结束时，控制流会继续往下走。而 `$progress` 协程会一直运行。
永远地。它永远不会停止。PHP 进程也永远不会停止（除非从外部把它杀掉）。

`$progress->cancel()` 会停止 `$progress` 协程。但它是怎么做到的？

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

我们把 `delay(1000)` 周围的代码改一下，看看会发生什么：
```bash
Async\AsyncCancellation
```

当 `$progress` 协程正在 `delay(1000)` 里休眠，此时又调用了 `cancel()`，
`delay` 就抛出了一个 `Async\AsyncCancellation` 异常。有意思的是，这个技巧对 `sleep(1)` 不起作用，
因为 `sleep(1)` 不会抛出异常，而 `delay` 会，而这正是我们在这里所依赖的。

可以说，在你的代码中使用 `delay` 实际上就建立了一份契约，允许其他代码中断协程的执行。
这非常方便，因为它再一次在不同模块之间分离了关注点：
1. 协程并不知道它的执行会在何时被中断。
2. 取消协程的代码也不知道协程究竟会以何种方式被中断。

协程不是靠某种魔法停下来的，它是靠异常停下来的。
协程无法在任意某个操作的中途被取消，只能在它自己选择让出控制权的那一点被取消。
这种类型的取消称为“协作式”取消。
