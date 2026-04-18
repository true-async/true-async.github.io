---
layout: docs
lang: zh
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /zh/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — 在独立并行线程中运行代码：数据传输、WeakReference/WeakMap、线程间的 ThreadChannel 与 Future。"
---

# Async\Thread：在独立线程中运行 PHP

## 为什么需要线程

协程解决了 **I/O 密集型** 工作负载的并发问题——单个进程可以并发处理
数以千计的网络或磁盘等待请求。但协程有一个限制：它们全部运行
**在同一个 PHP 进程中**，轮流从调度器获得控制权。如果某个任务是
**CPU 密集型**的——压缩、解析、加密、大量计算——即使只是一个这样的协程
也会阻塞调度器，所有其他协程将会停滞，直到它完成。

线程解决了这一限制。`Async\Thread` 在**独立的并行线程**中运行一个闭包，
该线程拥有**自己隔离的 PHP 运行时**：独立的变量集、独立的自动加载器、独立的类
和函数。线程之间不直接共享任何内容——所有数据均**按值传递**，
通过深度拷贝完成。

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// 主协程中的计时器——证明并行线程
// 不会阻止主程序继续运行
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // 在独立线程中进行的大量计算
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

计时器与线程的繁重工作并发地平静完成了 5 次"滴答"——主程序
无需等待。

## 何时使用线程与协程

| 任务                                              | 工具                      |
|---------------------------------------------------|---------------------------|
| 大量并发 HTTP/数据库/文件请求                     | 协程                      |
| 长时间 CPU 密集型工作（解析、加密）               | 线程                      |
| 隔离不稳定代码                                    | 线程                      |
| 跨多个 CPU 核心的并行工作                         | 线程                      |
| 任务间的数据交换                                  | 协程 + 通道               |

线程是**相对昂贵的实体**：启动一个新线程比启动一个协程要重几个数量级。
这就是为什么你不应该创建数以千计的线程：典型的模式是少数长寿命的工作线程
（通常等于 CPU 核心数），或者为某个特定的繁重任务创建一个线程。

## 生命周期

```php
// 创建——线程立即启动并开始执行
$thread = spawn_thread(fn() => compute());

// 等待结果。调用协程等待；其他协程继续运行
$result = await($thread);

// 或者非阻塞检查
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` 实现了 `Completable` 接口，因此它可以像普通协程一样被传递给
`await()`、`await_all()`、`await_any()` 以及 `Task\Group`。

### 状态

| 方法              | 检查内容                                                    |
|-------------------|-------------------------------------------------------------|
| `isRunning()`     | 线程仍在执行中                                              |
| `isCompleted()`   | 线程已完成（成功或带有异常）                                |
| `isCancelled()`   | 线程已被取消                                                |
| `getResult()`     | 成功完成时的结果；否则为 `null`                             |
| `getException()`  | 出错时的异常；否则为 `null`                                 |

### 异常处理

在线程内部抛出的异常会被捕获，并包装在 `Async\RemoteException` 中传递给父线程：

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

如果异常类无法在父线程中加载（例如，它是一个仅存在于接收线程中的用户定义类），
`getRemoteException()` 可能返回 `null`。

## 线程间的数据传输

这是该模型最重要的部分。**所有内容均通过拷贝传输**——没有共享引用。

### 可以传输的内容

| 类型                                                    | 行为                                                        |
|---------------------------------------------------------|-----------------------------------------------------------------|
| 标量（`int`、`float`、`string`、`bool`、`null`）        | 拷贝                                                            |
| 数组                                                    | 深度拷贝；嵌套对象保留身份                                      |
| 具有声明属性的对象（`public $x` 等）                    | 深度拷贝；在接收端从头重新创建                                  |
| `Closure`                                               | 函数体连同所有 `use(...)` 变量一起传输                          |
| `WeakReference`                                         | 与被引用对象一起传输（见下文）                                  |
| `WeakMap`                                               | 连同所有键和值一起传输（见下文）                                |
| `Async\FutureState`                                     | 仅限一次，用于从线程写入结果（见下文）                          |

### 不能传输的内容

| 类型                                                   | 原因                                                                              |
|--------------------------------------------------------|----------------------------------------------------------------------------------|
| `stdClass` 及任何具有动态属性的对象                    | 动态属性没有类级声明，无法在接收线程中正确重建                                    |
| PHP 引用（`&$var`）                                    | 线程间的共享引用与该模型相矛盾                                                    |
| 资源（`resource`）                                     | 文件描述符、curl 句柄、套接字绑定到特定线程                                       |

尝试传输任何这些内容将立即在源端抛出 `Async\ThreadTransferException`：

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // 动态属性
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### 对象身份得到保留

在数据图中被多次引用的同一个对象，在**接收线程中只会被创建一次**，
所有引用都指向它。在单次传输操作（一个闭包的所有 `use(...)` 变量、
一次通道发送、一次线程结果）中，身份得到保留：

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// 类必须在接收线程的环境中声明——我们通过引导加载器来完成
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // 两个不同变量中的同一个实例
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // 通过一个引用的修改可以通过另一个引用看到
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

这同样适用于单个图中链接的对象：一个包含对共享嵌套对象引用的数组
在传输后将保留身份。

### 循环引用

包含通过普通对象形成循环的图可以被传输。限制在于，非常深度嵌套的循环
可能会达到内部传输深度限制（数百层）。实际上，这几乎不会发生。
形如 `$node->weakParent = WeakReference::create($node)` 的循环——即
一个通过 `WeakReference` 引用自身的对象——目前会遇到相同的限制，
因此最好不要在单个传输图中使用它们。

## 跨线程的 WeakReference

`WeakReference` 具有特殊的传输逻辑。行为取决于同时传输的其他内容。

### 被引用对象也被传输——身份得到保留

如果对象本身与 `WeakReference` 一起传输（直接传输、在数组内部、
或作为另一个对象的属性），那么在接收端 `$wr->get()` 返回的**正是**
那个出现在其他引用中的实例：

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### 被引用对象未被传输——WeakReference 变为失效

如果只传输了 `WeakReference` 而未传输对象本身，那么在接收线程中
没有人持有对该对象的强引用。根据 PHP 的规则，这意味着对象会立即
被销毁，`WeakReference` 变为**失效**（`$wr->get() === null`）。
这与单线程 PHP 中的行为完全相同：没有强所有者，对象被回收。

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj 未被传输
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### 源端已经失效

如果 `WeakReference` 在传输时在源端已经失效（`$wr->get() === null`），
它到达接收线程时同样是失效的。

### 单例

`WeakReference::create($obj)` 返回一个单例：对同一对象的两次调用会产生
**同一个** `WeakReference` 实例。这个属性在传输时得以保留——在接收线程中，
每个对象同样只会有一个 `WeakReference` 实例。

## 跨线程的 WeakMap

`WeakMap` 连同所有条目一起传输。但与单线程 PHP 中相同的规则适用：
**`WeakMap` 的键只在某人持有对它的强引用时才存活**。

### 键在图中——条目得以保留

如果键被单独传输（或通过其他已传输对象可达），
接收线程中的 `WeakMap` 包含所有条目：

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### 只有 WeakMap——条目消失

如果只传输了 `WeakMap`，而其键没有出现在图的其他任何地方，
`WeakMap` 在**接收线程中将为空**。这不是 bug；这是弱语义的直接结果：
没有强所有者，键在加载后立即被销毁，相应的条目也消失了。

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost 未被传输
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

要使条目在传输后"存活"，其键必须单独传输（或作为图中包含的某个其他对象的一部分）。

### 嵌套结构

`WeakMap` 可以包含其他 `WeakMap`、`WeakReference`、数组和普通对象作为值——
所有内容都递归传输。形如 `$wm[$obj] = $wm` 的循环可以被正确处理。

## 跨线程的 Future

直接在线程间传输 `Async\Future` 是**不可能的**：`Future` 是一个等待者对象，
其事件绑定到创建它的线程的调度器。相反，你可以传输"写入者"一侧——
`Async\FutureState`——且仅限**一次**。

典型模式：父线程创建一对 `FutureState` + `Future`，通过 `use(...)` 变量将
`FutureState` 本身传入线程，线程调用 `complete()` 或 `error()`，
父线程通过其 `Future` 接收结果：

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // 模拟繁重工作
        $data = "computed in thread";
        $state->complete($data);
    });

    // 父线程通过自己的 Future 等待——当线程调用 $state->complete() 时事件到达这里
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**重要约束：**

1. `FutureState` 只能传输到**一个**线程。第二次传输尝试将抛出异常。
2. 不允许传输 `Future` 本身——它属于父线程，只能唤醒其自身的所有者。
3. 在 `FutureState` 被传输后，父线程中的原始对象仍然有效：当线程
   调用 `complete()` 时，该变化通过父线程中的 `Future` 变得可见——
   `await($future)` 会解除阻塞。

这是在 `spawn_thread()` 的普通 `return` 之外，从线程向调用者传递**单个结果**
的唯一标准方式。如果需要流式传输多个值，请使用 `ThreadChannel`。

## 引导加载器：准备线程环境

线程有**自己的环境**，不继承父脚本中声明的类、函数或常量定义。
如果闭包使用了用户定义的类，该类必须被重新声明或通过自动加载加载——
为此提供了 `bootloader` 参数：

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config 必须在线程中存在
        return $config->name;
    },
    bootloader: function() {
        // 在主闭包之前在接收线程中执行
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

引导加载器保证在接收线程中，在加载 `use(...)` 变量和调用主闭包之前运行。
引导加载器的典型任务：注册自动加载、通过 `eval` 声明类、设置 ini 选项、加载库。

## 边界情况

### 超全局变量

`$_GET`、`$_POST`、`$_SERVER`、`$_ENV` 在线程中是独立的——它们像新请求一样
被全新初始化。在当前版本的 TrueAsync 中，在接收线程中填充它们的功能暂时
被禁用（计划稍后启用）——请关注 CHANGELOG。

### 静态函数变量

每个线程有自己独立的静态函数和类变量集。一个线程中的更改对其他线程不可见——
这是通用隔离机制的一部分。

### Opcache

Opcache 以只读方式在线程间共享其编译后的字节码缓存：脚本为整个进程编译一次，
每个新线程重用已准备好的字节码。这使得线程启动更快。

## 另请参阅

- [`spawn_thread()`](/zh/docs/reference/spawn-thread.html) — 在线程中运行闭包
- [`Async\ThreadChannel`](/zh/docs/components/thread-channels.html) — 线程间的通道
- [`await()`](/zh/docs/reference/await.html) — 等待线程结果
- [`Async\RemoteException`](/zh/docs/components/exceptions.html) — 接收线程错误的包装器
