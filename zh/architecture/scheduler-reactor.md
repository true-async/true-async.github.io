---
layout: architecture
lang: zh
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /zh/architecture/scheduler-reactor.html
page_title: "调度器与反应器"
description: "协程调度器和事件反应器的内部设计 -- 队列、上下文切换、libuv、fiber 池。"
---

# 协程、调度器与反应器

`Scheduler` 和 `Reactor` 是运行时的两个核心组件。
`Scheduler` 管理协程队列和上下文切换，
而 `Reactor` 通过 `Event loop` 处理 `I/O` 事件。

![调度器与反应器的交互](/diagrams/zh/architecture-scheduler-reactor/architecture.svg)

## 调度器

### 调度器协程与最小化上下文切换

在许多协程实现中，`scheduler` 使用单独的线程
或至少一个单独的执行上下文。协程调用 `yield`，
控制权传递给 `scheduler`，`scheduler` 选择下一个协程并切换到它。
这导致每次 `suspend`/`resume` 需要**两次**上下文切换：协程 -> 调度器 -> 协程。

在 `TrueAsync` 中，`Scheduler` 拥有**自己的协程**（`ZEND_ASYNC_SCHEDULER`），
带有专用上下文。当所有用户协程都在休眠且队列为空时，
控制权传递给此协程，在其中运行主循环：`reactor tick`、`microtasks`。

因为协程使用完整的执行上下文（栈 + 寄存器），
在现代 `x86` 上，上下文切换大约需要 10-20 ns。
因此，`TrueAsync` 通过允许某些操作直接在当前协程的上下文中执行来优化切换次数，
而无需切换到调度器。

当协程调用 `SUSPEND()` 操作时，`scheduler_next_tick()` 直接在当前协程的上下文中调用 --
该函数执行一次调度器 tick：微任务、反应器、队列检查。
如果队列中有就绪的协程，`Scheduler` **直接**切换到它，
绕过自己的协程。这是一次 `context switch` 而不是两次。
此外，如果队列中的下一个协程尚未启动而当前协程已经完成，
则根本不需要切换 -- 新协程接收当前上下文。

切换到 `Scheduler` 协程（通过 `switch_to_scheduler()`）**仅**在以下情况发生：
- 协程队列为空且反应器需要等待事件
- 切换到另一个协程失败
- 检测到死锁

### 主循环

![调度器主循环](/diagrams/zh/architecture-scheduler-reactor/scheduler-loop.svg)

在每个 tick 上，调度器执行：

1. **微任务** -- 处理 `microtasks` 队列（无需上下文切换的小任务）
2. **协程队列** -- 从 `coroutine_queue` 中提取下一个协程
3. **上下文切换** -- `zend_fiber_switch_context()` 切换到选定的协程
4. **结果处理** -- 返回后检查协程的状态
5. **反应器** -- 如果队列为空，调用 `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### 微任务

不是每个动作都值得一个协程。有时你需要在切换之间做一些快速的事情：
更新计数器、发送通知、释放资源。
为此创建协程过于昂贵，但该动作需要尽快执行。
这就是微任务的用武之地 -- 轻量级处理器，直接在当前协程的上下文中执行，
无需切换。

微任务必须是轻量、快速的处理器，因为它们可以直接访问
调度器的循环。在 `TrueAsync` 的早期版本中，微任务可以驻留在 PHP 端，但
由于严格的规则和性能考虑，决定将此机制
仅保留给 C 代码使用。

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

在 `TrueAsync` 中，微任务通过 FIFO 队列在每次协程切换前处理。
如果微任务抛出异常，处理将被中断。
执行后，微任务立即从队列中移除，其活跃引用计数减一。

微任务用于并发迭代器等场景，允许迭代
在前一个协程进入等待状态时自动转移到另一个协程。

### 协程优先级

在底层，`TrueAsync` 使用最简单的队列类型：环形缓冲区。这可能是
在简洁性、性能和功能之间取得最佳平衡的解决方案。

不能保证队列算法在未来不会改变。也就是说，在极少数情况下
协程优先级是重要的。

目前使用两种优先级：

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

高优先级协程在 `enqueue` 时被放置在队列**头部**。
提取总是从头部进行。没有复杂的调度，
只有插入顺序。这是一种刻意简化的方式：两个级别覆盖了
实际需求，而复杂的优先级队列（如 `RTOS` 中的）会增加
在 PHP 应用上下文中不合理的开销。

### 挂起与恢复

![挂起与恢复操作](/diagrams/zh/architecture-scheduler-reactor/suspend-resume.svg)

`Suspend` 和 `Resume` 操作是 `Scheduler` 的核心任务。

当协程调用 `suspend` 时，发生以下操作：

1. 启动协程的 `waker` 事件（`start_waker_events`）。
   只有在这一刻，定时器才开始计时，poll 对象
   才开始监听描述符。在调用 `suspend` 之前，事件未激活 --
   这允许先准备好所有订阅，然后通过一次调用开始等待。
2. **无需上下文切换**，调用 `scheduler_next_tick()`：
   - 处理微任务
   - 执行 `reactor tick`（如果经过了足够的时间）
   - 如果队列中有就绪的协程，`execute_next_coroutine()` 切换到它
   - 如果队列为空，`switch_to_scheduler()` 切换到 `scheduler` 协程
3. 当控制权返回时，协程带着保存了 `suspend` 结果的 `waker` 对象醒来。

**快速返回路径**：如果在 `start_waker_events` 期间事件已经触发
（例如，`Future` 已经完成），协程**根本不会被挂起** --
结果立即可用。因此，对已完成的
`Future` 调用 `await` 不会触发 `suspend`，不会导致上下文切换，直接返回结果。

## 上下文池

上下文是完整的 `C 栈`（默认为 `EG(fiber_stack_size)`）。
由于栈创建是昂贵的操作，`TrueAsync` 力求优化内存管理。
我们考虑了内存使用模式：协程不断地消亡和创建。
池模式非常适合这种场景！

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // 原生 C fiber（栈 + 寄存器）
    zend_vm_stack vm_stack;         // Zend VM 栈
    zend_execute_data *execute_data;// 当前 execute_data
    uint8_t flags;                  // Fiber 状态
};
```

调度器不是不断创建和销毁内存，而是将上下文返回池中
并反复重用它们。

计划中有智能池大小管理算法，
将根据工作负载动态调整，
以最小化 `mmap`/`mprotect` 延迟和总体内存占用。

### 切换处理器

在 `PHP` 中，许多子系统依赖于一个简单的假设：
代码从头到尾不间断地执行。
输出缓冲区（`ob_start`）、对象析构函数、全局变量 --
所有这些都线性工作：开始 -> 结束。

协程打破了这种模型。协程可以在工作中间休眠
并在数千次其他操作后醒来。在同一线程上的 `LEAVE` 和 `ENTER` 之间，
可能已经运行了数十个其他协程。

`Switch Handlers` 是绑定到**特定协程**的钩子。
与微任务不同（在任何切换时触发），
`switch handler` 仅在"它的"协程进入和退出时调用：

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = 进入，false = 退出
    bool is_finishing // true = 协程正在结束
    // 返回值：true = 保留处理器，false = 移除
);
```

返回值控制处理器的生命周期：
* `true` -- `handler` 保留并将再次被调用。
* `false` -- `Scheduler` 将移除它。

`Scheduler` 在三个时间点调用处理器：

```c
ZEND_COROUTINE_ENTER(coroutine)  // 协程获得控制权
ZEND_COROUTINE_LEAVE(coroutine)  // 协程让出控制权（suspend）
ZEND_COROUTINE_FINISH(coroutine) // 协程永久结束
```

#### 示例：输出缓冲区

`ob_start()` 函数使用单一的处理器栈。
当协程调用 `ob_start()` 然后进入休眠时，如果不做处理，另一个协程可能会看到其他协程的缓冲区。
（顺便说一下，**Fiber** 没有正确处理 `ob_start()`。）

一次性 `switch handler` 在协程启动时解决了这个问题：
它将全局 `OG(handlers)` 移入协程的上下文并清空全局状态。
之后，每个协程使用自己的缓冲区，一个中的 `echo` 不会与另一个混合。

#### 示例：关闭期间的析构函数

当 `PHP` 关闭时，会调用 `zend_objects_store_call_destructors()` --
遍历对象存储并调用析构函数。通常这是一个线性过程。

但析构函数可能包含 `await`。例如，数据库连接对象
想要正确关闭连接 -- 这是一个网络操作。
协程在析构函数内调用 `await` 并进入休眠。

剩余的析构函数需要继续。`switch handler` 捕获 `LEAVE` 时刻
并生成一个新的高优先级协程，从前一个协程停止的对象
继续遍历。

#### 注册

```c
// 向特定协程添加处理器
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// 添加到当前协程（如果调度器尚未启动则添加到 main）
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// 添加在主协程启动时触发的处理器
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

最后一个宏供在 `Scheduler` 启动之前初始化的子系统使用。
它们全局注册处理器，当 `Scheduler` 创建 `main` 协程时，
所有全局处理器被复制到其中并作为 `ENTER` 触发。

## 反应器

### 为什么选择 libuv？

`TrueAsync` 使用 `libuv`，与 `Node.js` 使用的库相同。

这个选择是经过深思熟虑的。`libuv` 提供：
- 统一的 `API`，支持 `Linux`（`epoll`）、macOS（`kqueue`）、Windows（`IOCP`）
- 内置支持定时器、信号、`DNS`、子进程、文件 I/O
- 经过生产环境数十亿请求测试的成熟代码库

也考虑过替代方案（`libev`、`libevent`、`io_uring`），
但 `libuv` 在易用性上胜出。

### 结构

```c
// 反应器全局数据（在 ASYNC_G 中）
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// 信号管理
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable*（事件）
HashTable *process_events;   // SIGCHLD 进程事件
```

### 事件类型与包装器

`TrueAsync` 中的每个事件都具有双重性质：在 `PHP` 核心中定义的 `ABI` 结构，
以及实际与 `OS` 交互的 `libuv handle`。`Reactor` 将它们"粘合"在一起，
创建两个世界共存的包装器：

| 事件类型          | ABI 结构                          | libuv handle                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Signal           | `zend_async_signal_event_t`     | 全局 `uv_signal_t`             |
| Filesystem       | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Process          | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

有关事件结构的更多详情，请参阅[事件与事件模型](/zh/architecture/events.html)。

### 异步 IO

对于流操作，使用统一的 `async_io_t`：

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI：event + fd/socket + type + state
    int crt_fd;             // CRT 文件描述符
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

同一个接口（`ZEND_ASYNC_IO_READ/WRITE/CLOSE`）适用于 `PIPE`、`FILE`、`TCP`、`UDP`、`TTY`。
具体实现在创建 handle 时根据 `type` 选择。

### 反应器循环

`reactor_execute(no_wait)` 调用 `libuv` `event loop` 的一个 tick：
- `no_wait = true` -- 非阻塞调用，仅处理就绪事件
- `no_wait = false` -- 阻塞直到下一个事件

`Scheduler` 使用两种模式。在协程切换之间 -- 非阻塞 tick
以收集已触发的事件。当协程队列为空时 --
阻塞调用以避免在空闲循环中浪费 CPU。

这是事件驱动服务器世界中的经典策略：`nginx`、`Node.js`
和 `Tokio` 使用相同的原则：有工作时无等待轮询，
没有工作时休眠。

## 切换效率：TrueAsync 在行业中的定位

### 有栈 vs 无栈：两个世界

实现协程有两种根本不同的方式：

**有栈**（Go、Erlang、Java Loom、PHP Fibers）-- 每个协程拥有自己的 C 栈。
切换涉及保存/恢复寄存器和栈指针。
主要优势：**透明性**。任何调用深度的任何函数都可以调用 `suspend`，
无需特殊注解。程序员编写普通的同步代码。

**无栈**（Rust async/await、Kotlin、C# async）-- 编译器将 `async` 函数
转换为状态机。"挂起"只是从函数 `return`，
"恢复"是带有新状态号的方法调用。栈根本不切换。
代价：**"函数着色"**（`async` 感染整个调用链）。

| 属性                                     | 有栈                               | 无栈                               |
|-------------------------------------------|-----------------------------------|-----------------------------------|
| 从嵌套调用中挂起                            | 是                                | 否 -- 仅从 `async` 函数             |
| 切换成本                                   | 15-200 ns（寄存器保存）              | 10-50 ns（写入对象字段）              |
| 每协程内存                                  | 4-64 KiB（独立栈）                  | 精确的状态机大小                      |
| 编译器透过 yield 优化                        | 不可能（栈不透明）                    | 可能（内联、HALO）                   |

`PHP 协程`是基于 `Boost.Context fcontext_t` 的**有栈**协程。

### 架构权衡

`TrueAsync` 选择了**有栈单线程**模型：

- **有栈** -- 因为 `PHP` 生态系统庞大，用 `async` "着色"数百万行
  现有代码成本很高。有栈协程允许使用普通 C 函数，这是 PHP 的关键需求。
- **单线程** -- PHP 历来是单线程的（没有共享可变状态），
  保持这一特性比处理其后果更容易。
  线程仅出现在用于 `CPU-bound` 任务的 `ThreadPool` 中。

由于 `TrueAsync` 目前复用低层 `Fiber API`，
上下文切换成本相对较高，未来可能会改善。

## 优雅关闭

`PHP` 脚本可能随时终止：未处理的异常、`exit()`、
操作系统信号。但在异步世界中，数十个协程可能持有打开的连接、
未写入的缓冲区和未提交的事务。

`TrueAsync` 通过受控关闭来处理这种情况：

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- 设置标志
2. 所有协程收到 `CancellationException`
3. 协程有机会执行 `finally` 块 -- 关闭连接、刷新缓冲区
4. `finally_shutdown()` -- 最终清理剩余的协程和微任务
5. 反应器停止

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
