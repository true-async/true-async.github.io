---
layout: architecture
lang: zh
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /zh/architecture/events.html
page_title: "事件与事件模型"
description: "基础结构 zend_async_event_t -- 所有异步操作的基础，回调系统、标志位、事件层次结构。"
---

# 事件与事件模型

事件（`zend_async_event_t`）是一个通用结构，
**所有**异步原语都从它继承：
协程、`future`、通道、定时器、`poll` 事件、信号等。

统一的事件接口允许：
- 通过回调订阅任何事件
- 在单次等待中组合异构事件
- 通过引用计数管理生命周期

## 基础结构

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // 附加数据的偏移量

    union {
        uint32_t ref_count;          // 用于 C 对象
        uint32_t zend_object_offset; // 用于 Zend 对象
    };

    uint32_t loop_ref_count;         // 事件循环引用计数

    zend_async_callbacks_vector_t callbacks;

    // 方法
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // 可空
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // 可空
    zend_async_event_callbacks_notify_t notify_handler; // 可空
};
```

### 事件的虚方法

每个事件都有一组小型的虚方法。

| 方法               | 用途                                               |
|------------------|----------------------------------------------------|
| `add_callback`   | 向事件订阅回调                                       |
| `del_callback`   | 取消订阅回调                                         |
| `start`          | 在反应器中激活事件                                    |
| `stop`           | 停用事件                                            |
| `replay`         | 重新传递结果（用于 future、协程）                      |
| `dispose`        | 释放资源                                            |
| `info`           | 事件的文本描述（用于调试）                             |
| `notify_handler` | 在通知回调之前调用的钩子                               |

#### `add_callback`

将回调添加到事件的动态 `callbacks` 数组。
调用 `zend_async_callbacks_push()`，
该函数递增回调的 `ref_count` 并将指针添加到向量中。

#### `del_callback`

从向量中移除回调（通过与最后一个元素交换实现 O(1)）
并调用 `callback->dispose`。

典型场景：在 `select` 等待多个事件时，
当其中一个触发后，其他事件通过 `del_callback` 取消订阅。

#### `start`

`start` 和 `stop` 方法用于可以放入 `EventLoop` 的事件。
因此，并非所有原语都实现此方法。

对于 EventLoop 事件，`start` 会递增 `loop_ref_count`，这允许
事件在有人需要它时一直保留在 EventLoop 中。

| 类型                                             | `start` 的作用                                                            |
|------------------------------------------------|--------------------------------------------------------------------------|
| Coroutine、`Future`、`Channel`、`Pool`、`Scope`   | 不做任何操作                                                              |
| Timer                                          | `uv_timer_start()` + 递增 `loop_ref_count` 和 `active_event_count`        |
| Poll                                           | `uv_poll_start()` 带事件掩码 (READABLE/WRITABLE)                          |
| Signal                                         | 在全局信号表中注册事件                                                      |
| IO                                             | 递增 `loop_ref_count` -- libuv 流通过 read/write 启动                      |

#### `stop`

`start` 的镜像方法。为 EventLoop 类型的事件递减 `loop_ref_count`。
最后一次 `stop` 调用（当 `loop_ref_count` 达到 0 时）才会真正停止 `handle`。

#### `replay`

允许后来的订阅者接收已完成事件的结果。
仅由存储结果的类型实现。

| 类型          | `replay` 返回的内容                              |
|--------------|--------------------------------------------------|
| **Coroutine** | `coroutine->result` 和/或 `coroutine->exception` |
| **Future**   | `future->result` 和/或 `future->exception`       |

如果提供了 `callback`，则同步调用并传入结果。
如果提供了 `result`/`exception`，值会被复制到指针中。
没有 `replay` 的情况下，等待已关闭的事件会产生警告。

#### `dispose`

此方法通过递减 `ref_count` 来尝试释放事件。
当计数达到零时，触发实际的资源释放。

#### `info`

用于调试和日志记录的人类可读字符串。

| 类型                  | 示例字符串                                                                 |
|----------------------|--------------------------------------------------------------------------|
| **Coroutine**        | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` 或 `"FutureState(pending)"`                   |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

在回调接收结果**之前**拦截通知的钩子。
所有事件默认为 `NULL`。用于 `Async\Timeout`：

## 事件生命周期

![事件生命周期](/diagrams/zh/architecture-events/lifecycle.svg)

事件经历以下几个状态：
- **Created** -- 内存已分配，`ref_count = 1`，可以订阅回调
- **Active** -- 在 `EventLoop` 中注册（`start()`），递增 `active_event_count`
- **Fired** -- `libuv` 调用了回调。对于周期性事件（timer、poll）-- 返回到 **Active**。对于一次性事件（DNS、exec、Future）-- 转换到 **Closed**
- **Stopped** -- 临时从 `EventLoop` 中移除（`stop()`），可以重新激活
- **Closed** -- `flags |= F_CLOSED`，无法订阅，当 `ref_count = 0` 时调用 `dispose`

## 交互：事件、回调、协程

![事件 -> 回调 -> 协程](/diagrams/zh/architecture-events/callback-flow.svg)

## 双重生命：C 对象与 Zend 对象

事件经常同时存在于两个世界中。
定时器、`poll` handle 或 `DNS` 查询是由 `Reactor` 管理的内部 `C` 对象。
但协程或 `Future` 同时也是可从用户代码访问的 `PHP` 对象。

`EventLoop` 中的 C 结构可能比引用它们的 `PHP` 对象存活更久，反之亦然。
C 对象使用 `ref_count`，而 `PHP` 对象使用 `GC_ADDREF/GC_DELREF`
配合垃圾回收器。

因此，`TrueAsync` 支持多种 PHP 对象和 C 对象之间的绑定类型。

### C 对象

对 PHP 代码不可见的内部事件使用 `ref_count` 字段。
当最后一个所有者释放引用时，调用 `dispose`：

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + 到达 0 时调用 dispose
```

### Zend 对象

协程是实现 `Awaitable` 接口的 `PHP` 对象。
它们不使用 `ref_count`，而是使用 `zend_object_offset` 字段，
该字段指向 `zend_object` 结构的偏移量。

`ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` 宏在所有情况下都能正确工作。

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

`zend_object` 是事件 C 结构的一部分，
可以使用 `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT` 恢复。

```c
// 从 PHP 对象获取事件（考虑事件引用）
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// 从事件获取 PHP 对象
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## 事件引用

某些事件面临一个架构问题：它们不能直接作为 `Zend` 对象。

例如定时器。`PHP GC` 可能随时决定回收对象，但 `libuv` 要求
通过带回调的 `uv_close()` 异步关闭 handle。如果 `GC` 在 `libuv`
还未完成 handle 处理时调用析构函数，就会导致 `use-after-free`。

在这种情况下，使用**事件引用**方式：`PHP` 对象存储的不是事件本身，而是指向事件的指针：

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // 指向实际事件的指针
} zend_async_event_ref_t;
```

通过这种方式，`PHP` 对象和 C 事件的生命周期是**独立的**。
`PHP` 对象可以被 `GC` 回收而不影响 `handle`，
而 `handle` 将在准备就绪时异步关闭。

`ZEND_ASYNC_OBJECT_TO_EVENT()` 宏通过 `flags` 前缀自动识别引用
并跟随指针。

## 回调系统

订阅事件是协程与外部世界交互的主要机制。
当协程想要等待定时器、套接字数据或另一个协程的完成时，
它会在相应事件上注册一个 `callback`。

每个事件存储一个动态的订阅者数组：

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // 指向活动迭代器索引的指针（或 NULL）
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` 解决了在迭代期间安全移除回调的问题。

### 回调结构

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

回调也是一个引用计数结构。这是必要的，因为单个 `callback`
可以同时被事件的向量和协程的 `waker` 引用。
`ref_count` 确保只有当双方都释放引用后才释放内存。

### 协程回调

`TrueAsync` 中的大多数回调用于唤醒协程。
因此，它们存储了关于协程和所订阅事件的信息：

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // 继承
    zend_coroutine_t *coroutine;         // 要唤醒谁
    zend_async_event_t *event;           // 来自哪里
};
```

这种绑定是 [Waker](/zh/architecture/waker.html) 机制的基础：

## 事件标志位

`flags` 字段中的位标志在事件生命周期的每个阶段控制其行为：

| 标志                   | 用途                                                                          |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | 事件已完成。`start`/`stop` 不再工作，无法订阅                                      |
| `F_RESULT_USED`       | 有人在等待结果 -- 无需未使用结果的警告                                              |
| `F_EXC_CAUGHT`        | 错误将被捕获 -- 抑制未处理异常警告                                                  |
| `F_ZVAL_RESULT`       | 回调中的结果是指向 `zval` 的指针（不是 `void*`）                                    |
| `F_ZEND_OBJ`          | 事件是 `Zend` 对象 -- 将 `ref_count` 切换为 `GC_ADDREF`                            |
| `F_NO_FREE_MEMORY`    | `dispose` 不应释放内存（对象不是通过 `emalloc` 分配的）                              |
| `F_EXCEPTION_HANDLED` | 异常已处理 -- 无需重新抛出                                                         |
| `F_REFERENCE`         | 该结构是 `Event Reference`，不是实际事件                                            |
| `F_OBJ_REF`           | 在 `extra_offset` 处有指向 `zend_object` 的指针                                    |
| `F_CLOSE_FD`          | 销毁时关闭文件描述符                                                               |
| `F_HIDDEN`            | 隐藏事件 -- 不参与 `Deadlock Detection`                                            |

### 死锁检测

`TrueAsync` 通过 `active_event_count` 追踪 `EventLoop` 中活跃事件的数量。
当所有协程都被挂起且没有活跃事件时 -- 这就是 `deadlock`：
没有任何事件能唤醒任何协程。

但有些事件始终存在于 `EventLoop` 中，与用户逻辑无关：
后台 `healthcheck` 定时器、系统处理器。如果将它们计为"活跃"，
`deadlock detection` 将永远不会触发。

对于这类事件，使用 `F_HIDDEN` 标志：

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // 标记为隐藏
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1，但仅在非隐藏时
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1，但仅在非隐藏时
```

## 事件层次结构

在 `C` 语言中没有类继承，但有一种技巧：如果结构的第一个字段
是 `zend_async_event_t`，那么指向该结构的指针可以安全地转换
为指向 `zend_async_event_t` 的指针。这正是所有专用事件
从基类"继承"的方式：

```
zend_async_event_t
|-- zend_async_poll_event_t      -- fd/socket 轮询
|   \-- zend_async_poll_proxy_t  -- 事件过滤代理
|-- zend_async_timer_event_t     -- 定时器（一次性和周期性）
|-- zend_async_signal_event_t    -- POSIX 信号
|-- zend_async_process_event_t   -- 等待进程终止
|-- zend_async_thread_event_t    -- 后台线程
|-- zend_async_filesystem_event_t -- 文件系统变更
|-- zend_async_dns_nameinfo_t    -- 反向 DNS
|-- zend_async_dns_addrinfo_t    -- DNS 解析
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- TCP 服务器套接字
|-- zend_async_trigger_event_t   -- 手动唤醒（跨线程安全）
|-- zend_async_task_t            -- 线程池任务
|-- zend_async_io_t              -- 统一 I/O
|-- zend_coroutine_t             -- 协程
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- 通道
|-- zend_async_group_t           -- 任务组
|-- zend_async_pool_t            -- 资源池
\-- zend_async_scope_t           -- 作用域
```

正因如此，`Waker` 可以使用同一个 `event->add_callback` 调用
订阅**任何**这些事件，无需了解具体类型。

### 专用结构示例

每个结构只在基础事件上添加其类型特有的字段：

**Timer** -- 最小扩展：
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // 毫秒
    bool is_periodic;
};
```

**Poll** -- 描述符上的 I/O 跟踪：
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // 要跟踪的内容：READABLE|WRITABLE|...
    async_poll_event triggered_events; // 实际发生的内容
};
```

**Filesystem** -- 文件系统监控：
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // 哪个文件发生了变更
};
```

**Exec** -- 执行外部命令：
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll 代理

想象这样一个场景：两个协程在同一个 TCP 套接字上 -- 一个读取，另一个写入。
它们需要不同的事件（`READABLE` 与 `WRITABLE`），但套接字只有一个。

`Poll Proxy` 解决了这个问题。它不会为同一个 fd 创建两个 `uv_poll_t` handle
（这在 `libuv` 中是不可能的），而是创建一个 `poll_event`
和多个带有不同掩码的代理：

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // 父 poll
    async_poll_event events;               // 此代理的事件子集
    async_poll_event triggered_events;     // 触发的内容
};
```

`Reactor` 聚合所有活跃代理的掩码，并将组合掩码传递给 `uv_poll_start`。
当 `libuv` 报告事件时，`Reactor` 检查每个代理
并仅通知掩码匹配的代理。

## 异步 IO

对于流式 I/O 操作（从文件读取、写入套接字、使用管道），
`TrueAsync` 提供了统一的 `handle`：

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // 用于 PIPE/FILE
        zend_socket_t socket;        // 用于 TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

同一个 `ZEND_ASYNC_IO_READ/WRITE/CLOSE` 接口适用于任何类型，
具体实现在创建 `handle` 时根据 `type` 选择。

所有 I/O 操作都是异步的，返回 `zend_async_io_req_t` -- 一个一次性请求：

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // 操作错误（或 NULL）
    char *buf;                 // 数据缓冲区
    bool completed;            // 操作完成？
    void (*dispose)(zend_async_io_req_t *req);
};
```

协程调用 `ZEND_ASYNC_IO_READ`，接收一个 `req`，
通过 `Waker` 订阅其完成，然后进入休眠状态。
当 `libuv` 完成操作后，`req->completed` 变为 `true`，
回调唤醒协程，协程从 `req->buf` 中获取数据。
