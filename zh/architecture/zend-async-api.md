---
layout: architecture
lang: zh
path_key: "/architecture/zend-async-api.html"
nav_active: architecture
permalink: /zh/architecture/zend-async-api.html
page_title: "TrueAsync ABI"
description: "PHP 核心异步 ABI 的架构 -- 函数指针、扩展注册、全局状态和 ZEND_ASYNC_* 宏。"
---

# TrueAsync ABI

`TrueAsync` `ABI` 建立在**定义**与**实现**的清晰分离之上：

| 层               | 位置                      | 职责                                              |
|-----------------|-------------------------|-------------------------------------------------|
| **Zend Engine** | `Zend/zend_async_API.h` | 类型、结构、函数指针的定义                           |
| **扩展**         | `ext/async/`            | 所有函数的实现，通过 API 注册                        |

`PHP` 核心不直接调用扩展函数。
而是使用 `ZEND_ASYNC_*` 宏来调用
扩展在加载时注册的 `function pointers`。

这种方式有两个目标：
1. 异步引擎可以与实现 `ABI` 的任意数量的扩展配合工作
2. 宏减少了对实现细节的依赖并最小化了重构工作

## 全局状态

与异步相关的全局状态部分位于 PHP 核心中，
也可以通过 `ZEND_ASYNC_G(v)` 宏以及其他专用宏访问，
例如 `ZEND_ASYNC_CURRENT_COROUTINE`。

```c
typedef struct {
    zend_async_state_t state;           // OFF -> READY -> ACTIVE
    zend_atomic_bool heartbeat;         // 调度器心跳标志
    bool in_scheduler_context;          // 当前在调度器中为 TRUE
    bool graceful_shutdown;             // 关闭期间为 TRUE
    unsigned int active_coroutine_count;
    unsigned int active_event_count;
    zend_coroutine_t *coroutine;        // 当前协程
    zend_async_scope_t *main_scope;     // 根作用域
    zend_coroutine_t *scheduler;        // 调度器协程
    zend_object *exit_exception;
    zend_async_heartbeat_handler_t heartbeat_handler;
} zend_async_globals_t;
```

### 启动

目前，`TrueAsync` 不会立即启动，而是在"适当"的时机延迟启动。
（这种方式未来会改变，因为几乎任何 PHP I/O 函数都会激活 `Scheduler`。）

当 `PHP` 脚本开始执行时，`TrueAsync` 处于 `ZEND_ASYNC_READY` 状态。
在通过 `ZEND_ASYNC_SCHEDULER_LAUNCH()` 宏首次调用需要 `Scheduler` 的函数时，
调度器被初始化并转换为 `ZEND_ASYNC_ACTIVE` 状态。

此时，正在执行的代码进入主协程，
并为 `Scheduler` 创建一个单独的协程。

除了显式激活 `Scheduler` 的 `ZEND_ASYNC_SCHEDULER_LAUNCH()` 外，
`TrueAsync` 还在 `php_execute_script_ex` 和 `php_request_shutdown` 函数中拦截控制。

```c
    // php_execute_script_ex

    if (prepend_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, prepend_file_p) == SUCCESS;
    }
    if (result) {
        result = zend_execute_script(ZEND_REQUIRE, retval, primary_file) == SUCCESS;
    }
    if (append_file_p && result) {
        result = zend_execute_script(ZEND_REQUIRE, NULL, append_file_p) == SUCCESS;
    }

    ZEND_ASYNC_RUN_SCHEDULER_AFTER_MAIN();
    ZEND_ASYNC_INITIALIZE;
```

这段代码允许在主线程执行完毕后将控制权传递给 `Scheduler`。
`Scheduler` 进而可以启动其他协程（如果存在的话）。

这种方式不仅确保了 TrueAsync 对 PHP 程序员 100% 透明，
还确保了完全的 `PHP SAPI` 兼容性。使用 `PHP SAPI` 的客户端继续将 `PHP` 视为同步的，
即使内部运行着 `EventLoop`。

在 `php_request_shutdown` 函数中进行最后的拦截以执行析构函数中的协程，
之后 `Scheduler` 关闭并释放资源。

## 扩展注册

由于 `TrueAsync ABI` 是 `PHP` 核心的一部分，它在最早阶段就对所有 `PHP` 扩展可用。
因此，扩展有机会在 `PHP Engine`
开始执行代码之前正确初始化 `TrueAsync`。

扩展通过一组 `_register()` 函数注册其实现。
每个函数接受一组函数指针并将它们
写入核心的全局 `extern` 变量。

根据扩展的目标，`allow_override` 允许合法地重新注册函数指针。
默认情况下，`TrueAsync` 禁止两个扩展定义相同的 `API` 组。

`TrueAsync` 分为几个类别，每个类别都有自己的注册函数：
* `Scheduler` -- 与核心功能相关的 API。包含大多数不同的函数
* `Reactor` -- 用于 `Event loop` 和事件的 API。包含创建不同事件类型和管理反应器生命周期的函数
* `ThreadPool` -- 用于管理线程池和任务队列的 API
* `Async IO` -- 异步 I/O API，包括文件描述符、套接字和 UDP
* `Pool` -- 用于管理通用资源池的 API，支持健康检查和断路器

```c
zend_async_scheduler_register(
    char *module,                    // 模块名称
    bool allow_override,             // 允许覆盖
    zend_async_scheduler_launch_t,   // 启动调度器
    zend_async_new_coroutine_t,      // 创建协程
    zend_async_new_scope_t,          // 创建作用域
    zend_async_new_context_t,        // 创建上下文
    zend_async_spawn_t,              // 生成协程
    zend_async_suspend_t,            // 挂起
    zend_async_enqueue_coroutine_t,  // 入队
    zend_async_resume_t,             // 恢复
    zend_async_cancel_t,             // 取消
    // ... 以及其他
);
```

```c
zend_async_reactor_register(
    char *module,
    bool allow_override,
    zend_async_reactor_startup_t,    // 初始化事件循环
    zend_async_reactor_shutdown_t,   // 关闭事件循环
    zend_async_reactor_execute_t,    // 一次反应器 tick
    zend_async_reactor_loop_alive_t, // 是否有活跃事件
    zend_async_new_socket_event_t,   // 创建 poll 事件
    zend_async_new_timer_event_t,    // 创建定时器
    zend_async_new_signal_event_t,   // 订阅信号
    // ... 以及其他
);
```
