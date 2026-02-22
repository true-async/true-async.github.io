---
layout: architecture
lang: zh
path_key: "/architecture.html"
nav_active: architecture
permalink: /zh/architecture.html
page_title: "架构"
description: "TrueAsync 组件的内部设计 -- 资源池、PDO Pool、架构图和 C API。"
---

## 概述

架构部分描述了 TrueAsync 关键组件在 C 代码层面的内部设计：
数据结构、算法、与 Zend Engine 的集成，
以及 PHP 核心与异步扩展之间的交互。

这些资料面向希望了解 TrueAsync"底层"工作原理
或计划创建自己扩展的开发者。

### [TrueAsync ABI](/zh/architecture/zend-async-api.html)

异步 ABI 的核心：函数指针、扩展注册系统、
全局状态（`zend_async_globals_t`）、`ZEND_ASYNC_*` 宏
以及 API 版本管理。

### [协程、调度器与反应器](/zh/architecture/scheduler-reactor.html)

协程调度器和事件反应器的内部设计：
队列（环形缓冲区）、通过 fiber 进行上下文切换、
微任务、libuv 事件循环、fiber 上下文池和优雅关闭。

### [事件与事件模型](/zh/architecture/events.html)

`zend_async_event_t` -- 所有异步原语继承的基础数据结构。
回调系统、引用计数、事件引用、标志位、事件类型层次结构。

### [Waker -- 等待与唤醒机制](/zh/architecture/waker.html)

Waker 是协程与事件之间的纽带。
状态、`resume_when`、协程回调、错误传递、
`zend_coroutine_t` 结构和切换处理器。

### [异步上下文中的垃圾回收](/zh/architecture/async-gc.html)

PHP GC 如何与协程、作用域和上下文配合工作：`get_gc` 处理器、
fiber 栈遍历、僵尸协程、层级上下文
以及循环引用保护。

## 组件

### [Async\Pool](/zh/architecture/pool.html)

通用资源池。涵盖主题：
- 双层数据结构（核心中的 ABI + 扩展中的内部结构）
- 带有等待协程 FIFO 队列的获取/释放算法
- 通过定期定时器进行健康检查
- 具有三种状态的断路器
- 扩展的 C API（`ZEND_ASYNC_POOL_*` 宏）

### [PDO Pool](/zh/architecture/pdo-pool.html)

基于 `Async\Pool` 的 PDO 专用层。涵盖主题：
- 模板连接与真实连接的延迟创建
- 通过 HashTable 将连接绑定到协程
- 活跃事务和语句期间的连接锁定
- 协程完成时自动回滚和清理
- 工厂中的凭证管理
