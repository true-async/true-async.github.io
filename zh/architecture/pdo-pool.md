---
layout: architecture
lang: zh
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /zh/architecture/pdo-pool.html
page_title: "PDO Pool 架构"
description: "PDO Pool 的内部设计 -- 组件、连接生命周期、绑定到协程、凭证管理。"
---

# PDO Pool 架构

> 本文描述 PDO Pool 的内部设计。
> 如果您正在查找使用指南，请参阅 [PDO Pool：连接池](/zh/docs/components/pdo-pool.html)。

## 双层架构

PDO Pool 由两层组成：

**1. PDO 核心（`pdo_pool.c`）** -- 将连接绑定到协程的逻辑、
事务管理、语句引用计数。

**2. Async Pool（`zend_async_pool_t`）** -- 异步扩展中的通用资源池。
管理空闲连接队列、限制和健康检查。
它不了解 PDO -- 它处理抽象的 `zval` 值。

这种分离允许对任何资源使用相同的池化机制，
而不仅仅是数据库。

## 组件图

![PDO Pool -- 组件](/diagrams/zh/architecture-pdo-pool/components.svg)

## 模板连接

创建带有池的 `PDO` 时，核心**不会打开**真实的 TCP 连接。
而是创建一个**模板** -- 一个 `pdo_dbh_t` 对象，存储
DSN、用户名、密码和对驱动程序的引用。所有真实连接随后
根据此模板按需创建。

对于模板，调用 `db_handle_init_methods()` 而不是 `db_handle_factory()`。
此方法设置驱动程序的方法表（`dbh->methods`），
但不创建 TCP 连接或分配 `driver_data`。

## 连接生命周期

![池中的连接生命周期](/diagrams/zh/architecture-pdo-pool/lifecycle.svg)

## 从池中创建连接（时序图）

![从池中创建连接](/diagrams/zh/architecture-pdo-pool/connection-sequence.svg)

## 内部 API

### pdo_pool.c -- 公共函数

| 函数                        | 用途                                                    |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | 基于构造函数属性为 `pdo_dbh_t` 创建池                      |
| `pdo_pool_destroy()`       | 释放所有连接，关闭池，清空哈希表                            |
| `pdo_pool_acquire_conn()`  | 为当前协程返回连接（复用或获取）                            |
| `pdo_pool_peek_conn()`     | 返回绑定的连接而不获取（如果没有则返回 NULL）                |
| `pdo_pool_maybe_release()` | 如果没有事务或语句，将连接返回池中                           |
| `pdo_pool_get_wrapper()`   | 为 `getPool()` 方法返回 `Async\Pool` PHP 对象               |

### pdo_pool.c -- 内部回调

| 回调                         | 何时调用                                                  |
|-----------------------------|-----------------------------------------------------------|
| `pdo_pool_factory()`        | 池需要新连接（池为空时获取）                                |
| `pdo_pool_destructor()`     | 池销毁连接（关闭或驱逐时）                                  |
| `pdo_pool_healthcheck()`    | 定期检查 -- 连接是否仍然存活？                              |
| `pdo_pool_before_release()` | 返回池之前 -- 回滚未提交的事务                              |
| `pdo_pool_free_conn()`      | 关闭驱动程序连接，释放内存                                  |

### 绑定到协程

连接通过 `pool_connections` 哈希表绑定到协程，
其中键是协程标识符，值是指向 `pdo_dbh_t` 的指针。

协程标识符由 `pdo_pool_coro_key()` 函数计算：
- 如果协程是 PHP 对象 -- 使用 `zend_object.handle`（顺序 uint32_t）
- 对于内部协程 -- 使用指针地址右移 `ZEND_MM_ALIGNMENT_LOG2`

### 协程完成时的清理

当连接绑定到协程时，通过 `coro->event.add_callback()` 注册
`pdo_pool_cleanup_callback`。当协程完成（正常或出错）时，
回调自动将连接返回池中。这确保即使出现未处理的异常也不会泄漏连接。

### 锁定：连接锁定

连接被锁定到协程，满足以下至少一个条件时不会返回池中：

- `conn->in_txn == true` -- 活跃事务
- `conn->pool_slot_refcount > 0` -- 存在使用此连接的活跃语句（`PDOStatement`）

引用计数在创建语句时递增，在销毁时递减。
当两个条件都清除时，`pdo_pool_maybe_release()` 将连接返回池中。

## 工厂中的凭证管理

创建新连接时，`pdo_pool_factory()` 通过 `estrdup()` **复制**
模板中的 DSN、用户名和密码字符串。这是必要的，因为
驱动程序可能在 `db_handle_factory()` 期间修改这些字段：

- **PostgreSQL** -- 将 `data_source` 中的 `;` 替换为空格
- **MySQL** -- 如果未传入则从 DSN 分配 `username`/`password`
- **ODBC** -- 完全重建 `data_source`，嵌入凭证

成功调用 `db_handle_factory()` 后，通过 `efree()` 释放副本。
出错时，通过 `pdo_pool_free_conn()` 释放，
该函数也被池的析构函数使用。

## 与持久连接的不兼容性

持久连接（`PDO::ATTR_PERSISTENT`）与池不兼容。
持久连接绑定到进程并在请求之间存活，
而池在请求级别创建连接并具有自动生命周期管理。
同时启用两个属性将导致错误。

## 接下来

- [PDO Pool：连接池](/zh/docs/components/pdo-pool.html) -- 使用指南
- [协程](/zh/docs/components/coroutines.html) -- 协程的工作原理
- [Scope](/zh/docs/components/scope.html) -- 管理协程组
