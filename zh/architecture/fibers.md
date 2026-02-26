---
layout: architecture
lang: zh
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /zh/architecture/fibers.html
page_title: "TrueAsync 中的 Fiber"
description: "TrueAsync 如何改变 Fiber 的行为 -- 协程模式、GC、refcount、参数、exit/bailout、析构函数。"
---

# TrueAsync 中的 Fiber

在标准 `PHP` 中，Fiber（纤程）是一种拥有独立调用栈的协作式线程。
当启用 `TrueAsync` 扩展后，Fiber 将切换到**协程模式**：
不再直接切换栈帧，而是获得一个由调度器（`Scheduler`）管理的协程。

本文介绍使用 `TrueAsync` 时 Fiber 行为的关键变化。

## Fiber 的协程模式

当 `TrueAsync` 处于活动状态时，创建 `new Fiber(callable)` 不会初始化
栈切换上下文，而是创建一个协程：

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

调用 `$fiber->start()` 不会直接切换栈，而是通过 `ZEND_ASYNC_ENQUEUE_COROUTINE`
将协程加入调度器队列，随后调用方在 `zend_fiber_await()` 中挂起，
直到 Fiber 完成或暂停。

## 协程的 refcount 生命周期

Fiber 通过 `ZEND_ASYNC_EVENT_ADD_REF` 显式持有其协程的引用：

```
构造函数之后:     coroutine refcount = 1 (调度器)
start() 之后:     coroutine refcount = 2 (调度器 + Fiber)
```

Fiber 额外增加的 `+1` 引用是为了确保协程在执行完成后仍然存活，
否则 `getReturn()`、`isTerminated()` 等方法将无法访问执行结果。

该 `+1` 引用在 Fiber 的析构函数（`zend_fiber_object_destroy`）中释放：

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Fiber::start() 的参数 -- 复制到堆内存

宏 `Z_PARAM_VARIADIC_WITH_NAMED` 在解析 `Fiber::start()` 的参数时，
会将 `fcall->fci.params` 设置为指向 VM 栈帧的指针。
在标准 PHP 中这是安全的 -- `zend_fiber_execute` 通过栈切换立即被调用，
此时 `Fiber::start()` 的栈帧仍然存活。

在协程模式下，如果目标协程先被销毁，`fcall->fci.params` 可能变成
悬空指针。无法保证这种情况永远不会发生。

因此，在解析参数后需要将它们复制到堆内存：

```c
if (fiber->coroutine != NULL && fiber->fcall != NULL) {
    if (fiber->fcall->fci.param_count > 0) {
        uint32_t count = fiber->fcall->fci.param_count;
        zval *heap_params = emalloc(sizeof(zval) * count);
        for (uint32_t i = 0; i < count; i++) {
            ZVAL_COPY(&heap_params[i], &fiber->fcall->fci.params[i]);
        }
        fiber->fcall->fci.params = heap_params;
    }
    if (fiber->fcall->fci.named_params) {
        GC_ADDREF(fiber->fcall->fci.named_params);
    }
}
```

这样 `coroutine_entry_point` 就可以安全地使用和释放这些参数。

## 协程 Fiber 的 GC

`zend_fiber_object_gc` 不会将协程对象添加到 GC 缓冲区，
而是直接遍历协程的执行栈并传递找到的变量：

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Обход стека — как для обычного файбера
        for (; ex; ex = ex->prev_execute_data) {
            // ... добавляем CV в GC буфер ...
        }
    }
}
```

这仅适用于 `YIELD` 状态（Fiber 通过 `Fiber::suspend()` 暂停）。
对于其他状态（running、awaiting child），栈处于活动状态，不能进行遍历。

## GC 中的析构函数

在标准 PHP 中，`GC` 发现的对象的析构函数在同一上下文中同步调用。
在 `TrueAsync` 中，GC 在独立的 GC 协程中运行
（参见 [异步上下文中的垃圾回收](async-gc.html)）。

这意味着：

1. **执行顺序** -- 析构函数异步执行，在 `gc_collect_cycles()` 返回之后。

2. **析构函数中的 `Fiber::suspend()`** -- 不可用。析构函数在 GC 协程中执行，
   而非 Fiber 中。调用 `Fiber::suspend()` 将导致错误
   "Cannot suspend outside of a fiber"。

3. **析构函数中的 `Fiber::getCurrent()`** -- 返回 `NULL`，因为析构函数
   在 Fiber 上下文之外执行。

因此，依赖于 GC 在 Fiber 内部同步执行析构函数的测试，
在 `TrueAsync` 中被标记为 `skip`。

## 关闭时的生成器

在标准 PHP 中，当 Fiber 被销毁时，生成器会被标记为
`ZEND_GENERATOR_FORCED_CLOSE`。这会禁止 finally 块中的 `yield from` --
生成器正在终止，不应创建新的依赖关系。

在 `TrueAsync` 中，协程接收的是优雅取消（graceful cancellation），
而非强制关闭。生成器不会被标记为 `FORCED_CLOSE`，
finally 块中的 `yield from` 可以正常执行。这是一个已知的行为差异。

目前尚不确定是否需要更改这一行为。
