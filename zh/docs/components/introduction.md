---
layout: docs
lang: zh
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /zh/docs/components/introduction.html
page_title: "为什么需要异步？"
description: "什么是异步以及为什么需要它？"
---

## 传统 PHP (FPM) 的工作方式

![FPM 模型](../../../assets/docs/fpm_model.jpg)

如果将 PHP 服务器应用程序比作一家餐厅，它可能会被认为是一家高档餐厅，
每张桌子都有专属服务员。

每个新的服务器请求都由独立的 PHP 虚拟机、进程或线程处理，
处理完成后状态被销毁。
这就相当于一个服务员服务完一张桌子后就被解雇或者被清除了记忆。

这种模型有一个优势：如果发生 PHP 错误、内存泄漏、
忘记关闭的数据库连接 -- 不会影响其他请求。每个请求都是隔离的。
这意味着开发更简单，调试更简单，并且具有很高的容错性。

近年来，PHP 社区一直在尝试引入有状态模型，
即单个 PHP 虚拟机可以服务多个请求，在请求之间保持状态。
例如，Laravel Octane 项目使用 Swoole 或 RoadRunner，通过在请求之间保持状态来实现更好的性能。
但这远非可能性的极限。

每次点单后就解雇服务员代价太高。
因为菜肴在厨房准备很慢，服务员大部分时间都在等待。
PHP-FPM 也是如此：PHP 虚拟机处于空闲状态。
有更多的上下文切换、
更多创建和销毁进程或线程的开销，
以及更多的资源消耗。

```php
// 传统 PHP-FPM
$user = file_get_contents('https://api/user/123');     // 站着等 300ms
$orders = $db->query('SELECT * FROM orders');          // 站着等 150ms
$balance = file_get_contents('https://api/balance');   // 站着等 200ms

// 花费：650ms 纯等待
// CPU 空闲。内存空闲。一切都在等待。
```

## 并发

![并发模型](../../../assets/docs/concurrency_model.jpg)

由于厨房不能立即准备好菜肴，
而服务员在准备期间有空闲时间，
就有机会处理多位顾客的订单。

这个方案可以非常灵活地运作：
1 号桌点了三道菜。
2 号桌点了两道菜。
服务员先给 1 号桌上第一道菜，然后给 2 号桌上第一道菜。
或者也许他设法给第一桌上了两道菜，给第二桌上了一道。或者反过来！

这就是并发：在不同的逻辑执行线程之间共享单个资源（`CPU`），
这些逻辑执行线程被称为协程。

```php
use function Async\spawn;
use function Async\await;

// "并发"启动所有三个请求
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// 当一个请求在等待响应时，我们处理其他的！
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// 花费：300ms（最慢请求的时间）
```

## 并发不是并行

理解两者的区别很重要。

**并发** -- 如 `True Async`、`JavaScript`、`Python`：
- 一个服务员在不同桌子之间快速切换
- 一个 PHP 线程在不同任务之间切换
- 任务是**交替执行**的，但不是同时执行
- 没有竞态条件 -- 在任何给定时刻只有一个协程在运行

**并行** -- 这是多线程（`Go`）：
- 多个服务员同时工作
- 多个线程在不同的 CPU 核心上执行
- 任务**真正同时**执行
- 需要互斥锁、锁以及所有相关的复杂性

## 接下来

现在你理解了本质。你可以深入了解：

- [效率](../evidence/concurrency-efficiency.md) -- 最大性能需要多少协程
- [证据基础](../evidence/coroutines-evidence.md) -- 确认协程有效性的测量、基准和研究
- [Swoole 实践](../evidence/swoole-evidence.md) -- 真实测量：Appwrite +91%、IdleMMO 3500 万请求/天、数据库基准测试
- [Python asyncio 实践](../evidence/python-evidence.md) -- Duolingo +40%、Super.com -90% 成本、Instagram、uvloop 基准测试
- [协程](coroutines.md) -- 它们的底层工作原理
- [Scope](scope.md) -- 如何管理协程组
- [调度器](scheduler.md) -- 谁决定运行哪个协程
