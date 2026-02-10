---
layout: page
lang: zh
path_key: "/motivation.html"
nav_active: motivation
permalink: /zh/motivation.html
page_title: "动机"
description: "为什么 PHP 需要内置的异步功能"
---

## 为什么 PHP 需要异步？

`PHP` 是最后几个仍然没有内置并发执行支持的主流语言之一（**在语言层面**）。
Python 有 `asyncio`，`JavaScript` 原生基于事件循环，`Go` 有 goroutines，
`Kotlin` 有 coroutines。`PHP` 仍然停留在「一个请求——一个进程」的范式中，
尽管大多数实际应用程序的主要时间都花在等待 `I/O` 上（`IO Bound`）。

## 碎片化问题

如今，`PHP` 中的异步通过扩展实现：`Swoole`、`AMPHP`、`ReactPHP`。
每个都创建了**自己的生态系统**，拥有不兼容的 `API`、
自己的数据库驱动、`HTTP` 客户端和服务器。

这导致了关键问题：

- **代码重复** —— 每个扩展都被迫为 `MySQL`、`PostgreSQL`、`Redis`
  和其他系统重写驱动
- **不兼容** —— 为 `Swoole` 编写的库无法与 `AMPHP` 配合使用，反之亦然
- **局限性** —— 扩展无法使 `PHP` 标准函数
  （`file_get_contents`、`fread`、`curl_exec`）变为非阻塞的，
  因为它们无法访问内核
- **入门门槛** —— 开发者需要学习一个独立的生态系统，
  而不是使用熟悉的工具

## 解决方案：集成到内核

`TrueAsync` 提出了不同的方法 —— **在 PHP 内核层面实现异步**。
这意味着：

### 透明性

现有同步代码无需修改即可在协程中运行。
`file_get_contents()`、`PDO::query()`、`curl_exec()` —— 所有这些函数
在协程内执行时自动变为非阻塞的。

```php
// 这段代码已经在并发运行了！
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // 协程在 HTTP 请求期间挂起，
    // 其他协程继续运行
});
```

### 无染色函数

不像 Python（`async def` / `await`）和 JavaScript（`async` / `await`），
`TrueAsync` 不需要将函数标记为异步的。
任何函数都可以在协程中运行 —— 没有「同步」和「异步」世界的分隔。

### 统一标准

作为 `Zend` 一部分的标准 `True Async ABI` 允许**任何**扩展支持非阻塞 `I/O`：
`MySQL`、`PostgreSQL`、`Redis`、文件操作、套接字 —— 全部通过统一接口。
不再需要为每个异步框架重复编写驱动。

### 向后兼容

现有代码继续正常工作，但现在所有 PHP 代码默认都是异步的。无处不在。

## PHP 工作负载：为什么现在很重要

典型的 PHP 应用程序（Laravel、Symfony、WordPress）将
**70-90% 的时间花在等待 I/O 上**：数据库查询、外部 API 的 HTTP 调用、
文件读取。所有这些时间里，CPU 都在空闲。

使用协程，这些时间得到高效利用：

| 场景                     | 无协程           | 有协程           |
|--------------------------|-----------------|------------------|
| 3 个 DB 查询，各 20ms    | 60ms            | ~22ms            |
| HTTP + DB + 文件          | 顺序执行         | 并行执行         |
| 10 个 API 调用            | 10 × 延迟       | ~1 × 延迟        |

了解更多：
[IO-Bound vs CPU-Bound](/zh/docs/evidence/concurrency-efficiency.html),
[并发统计数据](/zh/docs/evidence/real-world-statistics.html)。

## 实际场景

- **Web 服务器** —— 在单个进程中处理多个请求
  （`FrankenPHP`、`RoadRunner`）
- **API 网关** —— 从多个微服务并行聚合数据
- **后台任务** —— 并发队列处理
- **实时** —— WebSocket 服务器、聊天机器人、流媒体

## 另请参阅：

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope 与结构化并发](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [TrueAsync 文档](/zh/docs.html)
- [协程交互式演示](/zh/interactive/coroutine-demo.html)
