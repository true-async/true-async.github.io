---
layout: architecture
lang: zh
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /zh/architecture/async-gc.html
page_title: "异步上下文中的垃圾回收"
description: "PHP GC 如何与协程、作用域和上下文配合工作 -- get_gc 处理器、僵尸协程、循环引用。"
---

# 异步上下文中的垃圾回收

在 `PHP` 中，垃圾回收器通常以同步方式工作。当可能的根缓冲区满时，
会在当前上下文中调用 `gc_collect_cycles()`。`GC` 计算循环引用，
并在循环中为标记为删除的对象调用析构函数。

在并发环境中，这种模型会失效。对象的析构函数可能会调用 `await` --
例如，为了正确关闭数据库连接。如果 `GC` 在协程内部运行，
`await` 将挂起该协程，使 `GC` 处于未完成状态。
其他协程将看到部分回收的对象。

因此，`TrueAsync` 不得不修改垃圾回收逻辑。

## GC 协程

当 `gc_possible_root` 缓冲区填满并触发阈值时，`zend_gc_collect_cycles()`
会在单独的协程中启动自身。

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // GC 已在另一个协程中运行
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... 实际的垃圾回收
}
```

触发 `GC` 的协程不会被阻塞并继续其工作，
而垃圾回收在下一个 `Scheduler` 时钟周期执行。

`GC` 协程获得自己的顶层 `Scope`（`parent = NULL`）。
这将垃圾回收与用户代码隔离：取消用户 `Scope`
不会影响 `GC`。

## 协程中的析构函数

主要问题出现在调用析构函数时，因为析构函数可能意外地
挂起协程。因此，`GC` 使用基于微任务的并发迭代器算法。
为了启动迭代，`GC` 会创建另一个迭代器协程。
这样做是为了创造顺序执行的假象，从而大大简化了 `GC`。

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // 为析构函数创建子协程
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // GC 协程在 dtor_scope 上挂起
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // GC 在析构函数运行时休眠

    return true;
}
```

析构函数使用 Scope 机制不仅用于控制协程的生命周期，还用于
等待它们完成。为此，会创建另一个子 `Scope`
来封装所有析构函数协程：

```
gc_scope                          <- 顶层 `GC`
  \-- GC 协程                     <- 标记 + 协调
       \-- dtor_scope             <- 子作用域
            \-- dtor-coroutine[0] <- 调用析构函数 (HI_PRIORITY)
```


`GC` 协程订阅 `dtor_scope` 的完成事件。它只会在
`dtor_scope` 中**所有**析构函数完成后才被唤醒。


![在独立协程中进行垃圾回收](/diagrams/zh/architecture-async-gc/gc-coroutine.svg)

## 如果析构函数调用了 await 会怎样？

这里使用经典的基于微任务的并发迭代器算法：
* 注册一个微任务，当发生上下文切换时执行
* 如果发生切换，微任务会创建另一个协程用于迭代

迭代器检查自己是否仍在同一个协程中：

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // 调用析构函数

        // 如果协程变了 -- 说明析构函数调用了 await
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // 中止遍历
        }
        idx++;
    }
    return SUCCESS;
}
```

如果 `ZEND_ASYNC_CURRENT_COROUTINE` 发生了变化，说明析构函数调用了 `await`，
当前协程进入了休眠状态。在这种情况下，迭代器直接退出，下一个迭代步骤
将在新的协程中启动。
