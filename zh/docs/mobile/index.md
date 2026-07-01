---
layout: docs
lang: zh
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /zh/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge：通过 JNI 在原生 Android 应用内运行的持久化 PHP 运行时。架构、事件交换、从 PHP 调用 Kotlin、代码生成。"
---

# TrueAsync Mobile

（演示项目，实验性，仓库
[native-bridge](https://github.com/true-async/native-bridge)，Android）

异步 PHP 非常适合 UI 应用：当程序在等待网络、读取磁盘，或等待下一个用户操作时，
界面不应该被卡住。TrueAsync 为此提供了专门的 C API：Trigger Event
（`zend_async_API.h` 中的 `ZEND_ASYNC_NEW_TRIGGER_EVENT()`）。它是一个只有单一方法
`trigger()` 的对象，任何 C 或 C++ 代码都可以从另一个线程调用它，以线程安全的方式
唤醒 PHP 反应器并把控制权交给它去处理事件。

**native-bridge** 正是为 Android 实现了这样的集成：PHP 作为持久化进程嵌入应用，
在后台线程上启动一次，运行一个事件循环（与整个生态系统中使用的同一个 TrueAsync
反应器），并双向与 Kotlin 通信。

## 为什么用持久化进程而不是请求/响应模式

常见的 PHP 场景是一次 Web 请求：进程启动，处理一个请求，然后退出。这不适合移动应用：
PHP 需要在应用打开期间一直存活，并像处理程序响应 HTTP 请求那样响应用户事件
（点按、传感器、位置）。这正是 native-bridge 提供的能力：PHP 在应用启动时启动一次，
在自己的线程中一直运行，直到被显式停止，而该线程内的 TrueAsync 协程会并发地处理事件
和后台工作。

## 桥接架构

这个桥接工作在两个方向上：

1. **从 Android 到 PHP。** Kotlin 把事件（一次点按、一条传感器读数、位置信息、
   任意自定义事件）推入一个队列，PHP 从自己的循环中把它们取出。
2. **从 PHP 到 Kotlin。** PHP 调用在 Kotlin 端实现的方法（显示一个 Toast、震动、
   把文本复制到剪贴板，等等）。

两个方向都经过 **JNI（Java Native Interface）**，这是让 C 代码调用 Kotlin/Java 代码、
反之亦然的标准 Android 机制。两个方向都不通过 JSON 或其他任何文本格式传递数据：
数值跨越边界时已经是带类型的，无需额外的转换。

PHP 运行在自己的操作系统线程上，永远不会阻塞 Android 的 UI 线程。如果 PHP 正在等待数据，
UI 线程依然保持响应，反过来也是一样。

## 方向一：从 Android 到 PHP 的事件

Kotlin 通过 JNI 把事件发送到一个队列，PHP 用 `NativeBridge::poll()` 读取。当队列为空时，
`poll()` 会立刻返回 `null`，PHP 应用自行决定是等待下一个事件，还是在此期间做点别的事情
（在演示应用中是一次短暂的 `usleep()` 暂停，期间 TrueAsync 得以运行后台协程和定时器）。

事件类型共有四种：屏幕触摸、位置数据、传感器数据（加速度计等），以及带名称和文本负载的
任意事件。演示应用正是用最后这种事件来标记按钮点击：

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

前三种事件类型（触摸、位置、传感器）不需要字符串分配，因此即使在高调用频率下
（例如加速度计的数据流）依然保持轻量。

## 方向二：从 PHP 到 Kotlin 的调用

当 PHP 调用一个模块方法，例如 `Toast::show('Hello', true)`，这个调用可以通过两种方式
到达 Kotlin：

### 通用路径

默认情况下，PHP 把参数打包进一个紧凑的带类型缓冲区（不使用 JSON 之类的字符串格式，
所以 Kotlin 无需解析文本，也不产生额外的内存分配），并通过一次调用
`NativeBridge::invoke()` 把它发出去。在这条路径上新增一个模块或方法完全不涉及 C 代码：
只需修改 Kotlin 和生成的 PHP 包装器，因此只需要对 Kotlin 端做一次 Gradle 重新构建，
不需要重新构建原生库。

### 快速路径：`#[FastPath]`

对于调用非常频繁的"热"方法（例如每一帧都要传入的传感器数据），PHP 规范会用
`#[FastPath]` 属性标记该方法。对于这样的方法，生成器会生成一个专门的带类型 C 函数，
直接通过 JNI 调用 Kotlin，不经过中间缓冲区。这类方法要求每次改动都重新构建原生库
（`.so` 文件），但运行更快，也没有额外的内存分配。方法本身的行为不会变化，
只是调用跨越 PHP/Kotlin 边界的方式不同。

## 描述一个模块：`#[BridgeModule]`

模块的契约在 PHP 端被描述为一个带 `#[BridgeModule]` 属性的接口：

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- 模块名称由接口名称派生（`ToastInterface` 变成模块 `Toast`），或者显式设置：
  `#[BridgeModule('Clipboard')]`。
- 方法上的 `#[Ui]` 表示 Kotlin 端的实现必须运行在 Android 的 UI 线程上
  （生成器会为你添加线程切换逻辑）。
- 方法上的 `#[FastPath]` 启用上面描述的快速调用路径。

## `tools/bridge/gen.php` 会生成什么

从一份 PHP 规范（一个带 `#[BridgeModule]` 属性的接口）出发，生成器每次运行时都会重建：

- 一个带抽象方法的 Kotlin 类（`ToastSpec`）；
- 调用路由代码（Kotlin）；
- 一个 PHP 包装器（`Toast::show(...)`），供 PHP 应用其余代码调用；
- 对于标记了 `#[FastPath]` 的方法，直接调用 Kotlin 的带类型 C 代码。

## PHP 应用生命周期

1. Kotlin 在后台线程上启动 PHP，并传给它入口 PHP 脚本的路径。
2. PHP 脚本调用 `NativeBridge::init()`；从那一刻起，桥接就准备好接受事件和调用了。
3. 从此应用在一个循环中运行：通过 `poll()` 拉取事件、处理它们，并在需要时
   （例如网络请求）派生后台 TrueAsync 协程。
4. 关闭是优雅的：Kotlin 调用 `NativeBridge.stop()`，PHP 循环通过
   `NativeBridge::shouldStop()` 感知到这一点，收尾并干净地释放资源。

## 示例：按钮上的计数器

一个基于演示应用简化后的例子：一个按钮用来启动和停止一个不断递增的计数器，
它的值直接更新在 UI 上。启动和停止都是用一个普通的 TrueAsync 协程的
`spawn()`/`cancel()` 实现的，不会阻塞 UI 线程：

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

第二次点击会通过 `cancel()` 取消 `$counter` 协程，计数器就停在它达到的那个值上。
包含多个独立计数器的完整示例在仓库的 `android/app.php` 中。

## 状态与限制

- 目前只支持 Android；iOS 支持已在规划中，但尚未实现。
- 桥接目前只能传递简单类型：字符串、整数、浮点数、布尔值。按字段传递复合对象
  （同样不使用字符串格式）正在规划中。
- PHP 到 Kotlin 方向是同步的：方法会立即返回结果；这一侧尚不支持延迟（异步）结果。
- PHP 的 opcache 在 Android 上被强制关闭：应用沙箱不允许它使用所需的锁文件和
  可执行内存。
- 需要线程安全（ZTS）的 PHP 构建，因为 PHP 运行在自己的操作系统线程上，
  而不是应用的主线程。

## 也可参考

- [路线图：TrueAsync Mobile](/zh/roadmap.html)
- [GitHub 上的 native-bridge 仓库](https://github.com/true-async/native-bridge)
