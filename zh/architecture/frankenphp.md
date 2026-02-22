---
layout: architecture
lang: zh
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /zh/architecture/frankenphp.html
page_title: "FrankenPHP 集成"
description: "TrueAsync 如何将 FrankenPHP 变成完全异步的服务器 -- 每请求一个协程、零拷贝响应、双通知路径。"
---

# TrueAsync + FrankenPHP：多请求，单线程

在本文中，我们研究将 `FrankenPHP` 与 `TrueAsync` 集成的经验。
`FrankenPHP` 是基于 `Caddy` 的服务器，在 `Go` 进程内运行 `PHP` 代码。
我们为 `FrankenPHP` 添加了 `TrueAsync` 支持，使每个 `PHP` 线程可以同时处理多个请求，
使用 `TrueAsync` 协程进行编排。

## FrankenPHP 的工作原理

`FrankenPHP` 是一个将 `Go` 世界（`Caddy`）和 `PHP` 捆绑在一起的进程。
`Go` 拥有进程，而 `PHP` 充当"插件"，`Go` 通过 `SAPI` 与之交互。
为此，`PHP` 虚拟机在单独的线程中运行。`Go` 创建这些线程
并调用 `SAPI` 函数来执行 `PHP` 代码。

对于每个请求，`Caddy` 创建一个独立的 goroutine 来处理 HTTP 请求。
goroutine 从池中选择一个空闲的 `PHP` 线程，通过 channel 发送请求数据，
然后进入等待状态。

当 `PHP` 完成响应的构建后，goroutine 通过 channel 接收响应并将其传回 `Caddy`。

我们改变了这种方式，使 goroutine 现在可以向同一个 `PHP` 线程发送多个请求，
而 `PHP` 线程学会了异步处理这些请求。

### 整体架构

![FrankenPHP + TrueAsync 整体架构](/diagrams/zh/architecture-frankenphp/architecture.svg)

该图展示了三个层次。让我们逐一分析。

### 将 Go 集成到 TrueAsync 调度器中

为了让应用程序工作，PHP 的 `Reactor` 和 `Scheduler` 必须与 `Caddy` 集成。
因此，我们需要某种跨线程通信机制，
既兼容 `Go` 世界又兼容 `PHP` 世界。`Go` channel 是线程间数据传输的绝佳选择，
可以从 `C-Go` 访问。但仅此还不够，因为 `EventLoop` 循环可能会进入休眠。

这是一种广为人知的老方法，
几乎可以在任何 Web 服务器中找到：传输通道
与 `fdevent` 的组合（在 macOS/Windows 上使用 `pipe`）。

如果通道不为空，`PHP` 将从中读取，所以我们只需添加另一个值。
如果通道为空，`PHP` 线程正在休眠，需要被唤醒。这就是 `Notify()` 的用途。

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- 最快的选项
        // ...
    }
    // 回退：macOS/BSD 使用 pipe
    syscall.Pipe(fds[:])
}
```

在 `PHP` 端，`eventfd` 描述符注册到 `Reactor` 中：

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

`Reactor`（基于 `libuv`）开始监控描述符。一旦 `Go` 写入
`eventfd`，`Reactor` 就会唤醒并调用请求处理回调。

现在，当 goroutine 将请求数据
打包成 `contextHolder` 结构并传递给 `Dispatcher` 以投递到 `PHP` 线程。
`Dispatcher` 以轮询方式循环遍历 `PHP` 线程，
并尝试将请求上下文发送到
绑定到特定线程的缓冲 `Go` channel（`requestChan`）。
如果缓冲区已满，`Dispatcher` 尝试下一个线程。
如果所有线程都忙 -- 客户端收到 `HTTP 503`。

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### 与调度器的集成

当 `FrankenPHP` 初始化并创建 `PHP` 线程时，
它使用 `True Async ABI`（`zend_async_API.h`）与 `Reactor`/`Scheduler` 集成。

`frankenphp_enter_async_mode()` 函数负责此过程，当
`PHP` 脚本通过 `HttpServer::onRequest()` 注册回调时调用一次：

```c
void frankenphp_enter_async_mode(void)
{
    // 1. 从 Go 获取通知 FD
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. 在 Reactor 中注册 FD（慢路径）
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. 启动调度器
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. 替换心跳处理器（快路径）
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. 挂起主协程
    frankenphp_suspend_main_coroutine();

    // --- 只有在关闭时才会到达这里 ---

    // 6. 恢复心跳处理器
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. 释放资源
    close_request_event();
}
```

我们使用 `heartbeat handler`，这是 `Scheduler` 的特殊回调，来为每个
`Scheduler` tick 添加自己的处理器。该处理器允许 `FrankenPHP` 创建新的
用于请求处理的协程。

![双通知系统](/diagrams/zh/architecture-frankenphp/notification.svg)

现在 `Scheduler` 在每个 tick 上调用 `heartbeat handler`。该处理器
通过 `CGo` 检查 `Go` channel：

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

没有系统调用，没有 `epoll_wait`，通过 `CGo` 直接调用 `Go` 函数。
如果 channel 为空则立即返回。
这是最廉价的操作，也是 `heartbeat handler` 的强制要求。

如果所有协程都在休眠，`Scheduler` 将控制权传递给 `Reactor`，
`heartbeat` 停止跳动。此时 `AsyncNotifier` 介入：
`Reactor` 在 `epoll`/`kqueue` 上等待，当 `Go` 写入描述符时唤醒。

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

两个系统相互补充：`heartbeat` 在负载下提供最低延迟，
而 `poll event` 确保空闲期间零 `CPU` 消耗。

### 创建请求协程

`frankenphp_request_coroutine_entry()` 函数负责创建请求处理协程：

![请求生命周期](/diagrams/zh/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

为每个请求创建一个**独立的 `Scope`**。这是一个隔离的上下文，
允许控制协程及其资源的生命周期。
当 `Scope` 完成时，其中的所有协程都会被取消。

### 与 PHP 代码的交互

要创建协程，`FrankenPHP` 需要知道处理函数。
处理函数必须由 PHP 程序员定义。
这需要 `PHP` 端的初始化代码。`HttpServer::onRequest()` 函数
充当此初始化器，注册用于处理 `HTTP` 请求的 `PHP` 回调。

从 `PHP` 端来看，一切都很简单：

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

初始化发生在主协程中。
程序员必须创建一个 `HttpServer` 对象，调用 `onRequest()`，并显式"启动"服务器。
之后，`FrankenPHP` 接管控制权并阻塞主协程直到服务器关闭。

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // always false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

要将结果发送回 `Caddy`，`PHP` 代码使用 `Response` 对象，
该对象提供 `write()` 和 `end()` 方法。
在底层，内存被复制并通过 channel 发送结果。

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## 源代码

集成仓库是 `FrankenPHP` 的 fork，包含 `true-async` 分支：

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- 集成仓库

关键文件：

| 文件                                                                                                         | 描述                                                                      |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | 与 `Scheduler`/`Reactor` 的集成：heartbeat、poll event、协程创建               |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP 类 `HttpServer`、`Request`、`Response`                                   |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Go 端：`round-robin`、`requestChan`、`responseChan`、`CGo` 导出               |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`：`eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | 集成文档                                                                     |

集成使用的 TrueAsync ABI：

| 文件                                                                                                      | 描述                                        |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | API 定义：宏、函数指针、类型                       |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | 基础设施：注册、桩实现                              |
