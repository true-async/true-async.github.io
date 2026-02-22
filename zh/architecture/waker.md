---
layout: architecture
lang: zh
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /zh/architecture/waker.html
page_title: "Waker -- 等待与唤醒机制"
description: "Waker 的内部设计 -- 协程与事件之间的纽带：状态、resume_when、超时、错误传递。"
---

# 协程的等待与唤醒机制

为了存储协程的等待上下文，
`TrueAsync` 使用 `Waker` 结构。
它充当协程与其订阅的事件之间的纽带。
借助 `Waker`，协程始终确切地知道它正在等待哪些事件。

## Waker 结构

出于内存优化目的，`waker` 直接集成在协程结构（`zend_coroutine_t`）中，
这避免了额外的分配并简化了内存管理，
尽管代码中为了向后兼容仍使用 `zend_async_waker_t *waker` 指针。

`Waker` 保存等待事件的列表并聚合等待结果或异常。

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // 协程正在等待的事件
    HashTable events;

    // 上一次迭代中触发的事件
    HashTable *triggered_events;

    // 唤醒结果
    zval result;

    // 错误（如果唤醒由错误引起）
    zend_object *error;

    // 创建点（用于调试）
    zend_string *filename;
    uint32_t lineno;

    // 析构函数
    zend_async_waker_dtor dtor;
};
```

## Waker 状态

在协程生命周期的每个阶段，`Waker` 处于五种状态之一：

![Waker 状态](/diagrams/zh/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker 未激活
    ZEND_ASYNC_WAKER_WAITING,   // 协程正在等待事件
    ZEND_ASYNC_WAKER_QUEUED,    // 协程已排队等待执行
    ZEND_ASYNC_WAKER_IGNORED,   // 协程被跳过
    ZEND_ASYNC_WAKER_RESULT     // 结果可用
} ZEND_ASYNC_WAKER_STATUS;
```

协程以 `NO_STATUS` 开始 -- `Waker` 存在但未激活；协程正在执行。
当协程调用 `SUSPEND()` 时，`Waker` 转换为 `WAITING` 并开始监控事件。

当其中一个事件触发时，`Waker` 转换为 `QUEUED`：结果被保存，
协程被放入 `Scheduler` 队列中等待上下文切换。

`IGNORED` 状态用于协程已在队列中但必须被销毁的情况。
此时，`Scheduler` 不会启动协程，而是直接终结其状态。

当协程醒来时，`Waker` 转换为 `RESULT` 状态。
此时，`waker->error` 被传递到 `EG(exception)`。
如果没有错误，协程可以使用 `waker->result`。例如，`result` 就是
`await()` 函数返回的内容。

## 创建 Waker

```c
// 获取 waker（如果不存在则创建）
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// 为新的等待重新初始化 waker
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// 带超时和取消
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` 析构现有的 waker
并将其重置为初始状态。这允许不需要分配
就能重用 waker。

## 订阅事件

zend_async_API.c 模块提供了几个现成的函数来将协程绑定到事件：

```c
zend_async_resume_when(
    coroutine,        // 要唤醒哪个协程
    event,            // 要订阅哪个事件
    trans_event,      // 转移事件所有权
    callback,         // 回调函数
    event_callback    // 协程回调（或 NULL）
);
```

`resume_when` 是主要的订阅函数。
它创建一个 `zend_coroutine_event_callback_t`，将其
绑定到事件和协程的 waker。

作为回调函数，您可以使用三个标准函数之一，
取决于您希望如何唤醒协程：

```c
// 成功结果
zend_async_waker_callback_resolve(event, callback, result, exception);

// 取消
zend_async_waker_callback_cancel(event, callback, result, exception);

// 超时
zend_async_waker_callback_timeout(event, callback, result, exception);
```
