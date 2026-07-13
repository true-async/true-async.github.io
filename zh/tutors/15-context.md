---
layout: tutorial
lang: zh
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /zh/tutors/15-context.html
page_title: "Context"
description: "Context：当全局变量不再奏效时，把“当前那个”存放在哪里。"
---

# Context

经典 PHP 一生都遵循一条简单的规则：一个进程，一个请求。整整一套文化从这条规则中生长出来：全局变量、静态属性、
单例。当前用户？静态属性 `Auth::$user`。用于日志的请求 ID？一个全局变量。它运作得天衣无缝，因为“当前那个”对
整个进程来说确实就是唯一的一个东西。

TrueAsync 废除了那条规则。如今数百个协程混杂着生活在单个进程里，服务着不同的用户。在一个协程里给 `Auth::$user`
赋值，下一个醒来的协程就会把它读回来，而如果那甚至还是同一个请求，那你就算走运。一个熟悉的故事：同样的事情发生
在第九章，当十个工作者共享单个 `PDO` 时。没有线程的竞争，只不过现在它发生在全局状态里。

那就把一切都作为参数传递？诚实，却也残忍：你得把一个授权令牌穿过二十个函数签名，而其中实际需要它的只有一个。
你真正想要的，是绑定在逻辑执行线程上、而非进程上的存储。而我们已经有了一个适合这活儿的结构：协程和作用域早已
构成了一棵树。

## 树上的存储

`Async\Context` 是一个绑定在作用域或协程上的键值存储。一个作用域的上下文对它所有的协程都可用：

```php
use function Async\current_context;

// 中间件，请求处理的开始
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

而从那里出发，在任何地方、在任何调用深度、不需要一个额外的参数：

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

请注意 `find`：它在当前上下文中查找这个键，如果没找到，就沿着作用域树往上攀爬。子作用域会自动看到它们父级的
数据，所以一个在处理器深处启动的协程，会找到在请求最开始设置的那个 `request_id`。这和 Go 的 `context.Context`
是同样的机制，只不过你不必手动去查找它、把它传来传去：那棵树已经在那里了。

请求之间不再互相妨碍：每个请求都有自己的作用域，因而也有自己的上下文。一千个并发请求，一千个独立的 `request_id`，
而没有一个全局变量。

## 三个层级

上下文存在于三个层级上，从最宽到最窄：

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // 整个进程：配置，供所有人共享
current_context();   // 当前作用域：请求、用户、区域设置
coroutine_context(); // 仅此协程：私有数据
```

`root_context` 是那些过去理应作为全局变量存在的东西的合法归宿：应用名称、设置。你显式地访问它：
`root_context()->find('app_name')`。`coroutine_context` 是相反的一极：它的数据除了协程自身以外对任何人都
不可见，即便是它在同一作用域里的邻居也看不到。在这两者之间，`find` 把各个作用域层级缝合起来：本地没找到，
就去问父级。

还有一个令人愉快的细节：

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException: key already exists
```

除非你显式地请求（`replace: true`），否则覆盖是被禁止的。上下文守护着自己，防范本章开头所说的全局变量的那种
顽疾：某个人，在某个地方，悄悄地覆盖了一个值。

## 旅程的终点

十五章之前，我们“同时”启动了两个函数，并惊讶地看到它们的输出交错在一起。从那时起，一整套系统已经成形，而它
的每一个层级都有自己所关切的事：

- **协程、`spawn`、`await`** — 并发的单元，以及一个结果的承诺。
- **取消、超时、异常** — 中断契约：没有什么会永远运行，也没有什么会悄无声息地死去。
- **`Future` 与通道** — 连接：单个结果，以及一个带同步的值流。
- **`Scope`、`TaskGroup`、`TaskSet`、`iterate`** — 结构：每个协程都有一个所有者，每个组都有一种等待策略。
- **池** — 资源纪律：少量连接，大量协程。
- **线程** — 面向计算的并行，没有共享内存。
- **`Context`** — 绑定在执行上、而非进程上的数据。

请注意我们从来不必去学的东西：互斥量、信号量、数据竞争、回调，或者把函数染成异步与同步两种颜色。代码始终是
普通的、顺序的 PHP，它只是不再干坐着空闲了。

从这里出发，有两条路。想要动手实践，就前往[文档](/zh/docs.html)，那里每一个组件都被拆解到最后一颗螺丝。想要
理解这一切在底层是如何运作的，就前往[架构](/zh/architecture.html)。或者，最好的办法，就是拿起你最慢的那个
脚本，看看一个 `spawn` 会给它带来什么。
