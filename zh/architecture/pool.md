---
layout: architecture
lang: zh
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /zh/architecture/pool.html
page_title: "Async\\Pool 架构"
description: "通用资源池 Async\\Pool 的内部设计 -- 数据结构、获取/释放算法、健康检查、断路器。"
---

# Async\Pool 架构

> 本文描述通用资源池的内部设计。
> 如果您正在查找使用指南，请参阅 [Async\Pool](/zh/docs/components/pool.html)。
> PDO 专用层请参阅 [PDO Pool 架构](/zh/architecture/pdo-pool.html)。

## 数据结构

池的实现分为两层：PHP 核心中的公共 ABI 结构
和异步扩展中的扩展内部结构。

![Pool 数据结构](/diagrams/zh/architecture-pool/data-structures.svg)

## 两种创建路径

池可以从 PHP 代码（通过 `Async\Pool` 构造函数）
或从 C 扩展（通过内部 API）创建。

| 路径   | 函数                                 | 回调                              | 使用者                 |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*`（PHP 可调用对象）  | 用户代码                |
| C API | `zend_async_pool_create_internal()` | 函数指针                          | PDO 及其他扩展           |

区别在于 `handler_flags`。设置标志后，池直接调用 C 函数，
绕过通过 `zend_call_function()` 调用 PHP 可调用对象的开销。

## Acquire：获取资源

![acquire() -- 内部算法](/diagrams/zh/architecture-pool/acquire.svg)

### 等待资源

当所有资源都忙且达到 `max_size` 时，协程通过
`ZEND_ASYNC_SUSPEND()` 挂起。等待机制类似于通道：

1. 创建 `zend_async_pool_waiter_t` 结构
2. 将等待者添加到 FIFO `waiters` 队列
3. 注册唤醒回调
4. 如果设置了超时 -- 注册定时器
5. `ZEND_ASYNC_SUSPEND()` -- 协程让出控制权

当另一个协程调用 `release()` 时发生唤醒。

## Release：归还资源

![release() -- 内部算法](/diagrams/zh/architecture-pool/release.svg)

## Healthcheck：后台监控

如果 `healthcheckInterval > 0`，创建池时会启动周期定时器。
定时器通过 `ZEND_ASYNC_NEW_TIMER_EVENT` 与反应器集成。

![Healthcheck -- 定期检查](/diagrams/zh/architecture-pool/healthcheck.svg)

健康检查仅验证**空闲**资源。忙碌的资源不受影响。
如果在移除失效资源后，总数降到 `min` 以下，池会创建替代资源。

## 环形缓冲区

空闲资源存储在环形缓冲区中 -- 一个固定容量的环形缓冲器。
初始容量为 8 个元素，按需扩展。

`push` 和 `pop` 操作在 O(1) 内运行。缓冲区使用两个指针（`head` 和 `tail`），
实现高效的资源添加和提取而无需移动元素。

## 与事件系统的集成

池继承自 `zend_async_event_t` 并实现完整的事件处理器集：

| 处理器          | 用途                                                     |
|----------------|----------------------------------------------------------|
| `add_callback` | 注册回调（用于等待者）                                     |
| `del_callback` | 移除回调                                                  |
| `start`        | 启动事件（NOP）                                           |
| `stop`         | 停止事件（NOP）                                           |
| `dispose`      | 完全清理：释放内存，销毁回调                                |

这使得：
- 通过事件回调挂起和恢复协程
- 将健康检查定时器与反应器集成
- 通过事件释放正确释放资源

## 垃圾回收

PHP 池包装器（`async_pool_obj_t`）实现了自定义 `get_gc`，
将空闲缓冲区中的所有资源注册为 GC 根。
这防止了没有来自 PHP 代码的显式引用的空闲资源
被过早垃圾回收。

## 断路器

池实现了具有三种状态的 `CircuitBreaker` 接口：

![断路器状态](/diagrams/zh/architecture-pool/circuit-breaker.svg)

状态转换可以是手动的，也可以通过 `CircuitBreakerStrategy` 自动进行：
- `reportSuccess()` 在成功 `release` 时调用（资源通过了 `beforeRelease`）
- `reportFailure()` 在 `beforeRelease` 返回 `false` 时调用
- 策略决定何时切换状态

## Close：关闭池

当池关闭时：

1. 池事件被标记为 CLOSED
2. 停止健康检查定时器
3. 所有等待的协程被唤醒并收到 `PoolException`
4. 所有空闲资源通过 `destructor` 销毁
5. 忙碌的资源继续存活 -- 它们将在 `release` 时被销毁

## 扩展的 C API

扩展（PDO、Redis 等）通过宏使用池：

| 宏                                                | 功能                          |
|--------------------------------------------------|------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | 使用 C 回调创建池               |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | 为池创建 PHP 包装器             |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | 获取资源                       |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | 释放资源                       |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | 关闭池                         |

所有宏调用异步扩展在加载时注册的函数指针。
这确保了隔离：PHP 核心不依赖于特定的池实现。

## 时序图：完整的获取-释放周期

![完整的 acquire -> use -> release 周期](/diagrams/zh/architecture-pool/full-cycle.svg)

## 接下来

- [Async\Pool：指南](/zh/docs/components/pool.html) -- 如何使用池
- [PDO Pool 架构](/zh/architecture/pdo-pool.html) -- PDO 专用层
- [协程](/zh/docs/components/coroutines.html) -- 协程的工作原理
