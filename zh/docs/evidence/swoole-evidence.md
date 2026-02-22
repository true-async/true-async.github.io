---
layout: docs
lang: zh
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /zh/docs/evidence/swoole-evidence.html
page_title: "Swoole 实践"
description: "Swoole 实践：来自 Appwrite 和 IdleMMO 的生产案例、独立基准测试、TechEmpower、与 PHP-FPM 的比较。"
---

# Swoole 实践：真实测量数据

Swoole 是一个用 C 编写的 PHP 扩展，提供事件循环、协程
和异步 I/O。它是 PHP 生态系统中唯一成熟的协程模型实现，
拥有多年的生产经验。

以下是真实测量数据的汇总：生产案例、独立基准测试
和 TechEmpower 数据。

### 性能提升的两个来源

从 PHP-FPM 过渡到 Swoole 提供了**两个独立的**优势：

1. **有状态运行时** — 应用程序加载一次后常驻内存。
   每次请求重新初始化（autoload、DI 容器、配置）的开销消失了。
   即使没有 I/O，该效果也能带来收益。

2. **协程并发** — 当一个协程等待数据库或外部 API 响应时，
   其他协程在同一核心上处理请求。该效果
   **仅在有 I/O 时**才体现，并且需要使用异步客户端
   （基于协程的 MySQL、Redis、HTTP 客户端）。

大多数公开基准测试**没有分离**这两种效果。
不含数据库的测试（Hello World、JSON）仅测量有状态效果。
含数据库的测试测量**两者之和**，但无法隔离协程的贡献。

以下每个部分都标注了哪种效果占主导地位。

## 1. 生产案例：Appwrite — 从 FPM 迁移到 Swoole（+91%）

> **测量的是什么：** 有状态运行时 **+** 协程并发。
> Appwrite 是一个 I/O 代理，CPU 工作量极少。收益来自
> 两个因素，但从公开数据无法隔离协程的贡献。

[Appwrite](https://appwrite.io/) 是一个用 PHP 编写的开源后端即服务（BaaS）。
Appwrite 为移动和 Web 应用程序的常见任务提供现成的服务器 API：
用户认证、数据库管理、
文件存储、云函数、推送通知。

从本质上说，Appwrite 是一个**纯 I/O 代理**：
几乎每个传入的 HTTP 请求都会转化为一个或多个
I/O 操作（MariaDB 查询、Redis 调用、
文件读写），自身的 CPU 计算量极少。
这种工作负载特征能从转向协程中获得最大收益：
当一个协程等待数据库响应时，其他协程在同一核心上处理新请求。

在 0.7 版本中，团队用 Swoole 替换了 Nginx + PHP-FPM。

**测试条件：**
500 个并发客户端，5 分钟的负载（k6）。
所有请求都发送到带有授权和滥用控制的端点。

| 指标                       | FPM (v0.6.2) | Swoole (v0.7) | 变化            |
|----------------------------|--------------|---------------|-----------------|
| 每秒请求数                 | 436          | 808           | **+85%**        |
| 5 分钟内总请求数           | 131,117      | 242,336       | **+85%**        |
| 响应时间（正常）           | 3.77 ms      | 1.61 ms       | **-57%**        |
| 响应时间（负载下）         | 550 ms       | 297 ms        | **-46%**        |
| 请求成功率                 | 98%          | 100%          | 无超时          |

团队报告的综合指标总体改善：**约 91%**。

**来源：** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. 生产案例：IdleMMO — 单台服务器每天 3500 万请求

> **测量的是什么：** 主要是**有状态运行时**。
> Laravel Octane 以"一个请求——一个 worker"的模式运行 Swoole，
> 没有在请求内部进行协程 I/O 复用。
> 性能收益源于 Laravel 不需要在每次请求时重新加载。

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) 是
一个 PHP 应用程序（Laravel Octane + Swoole），一款拥有 16 万以上用户的 MMORPG。

| 指标                      | 值                                |
|---------------------------|-----------------------------------|
| 每日请求数                | 35,000,000（平均约 405 req/s）    |
| 潜力（作者估计）          | 50,000,000+ 请求/天              |
| 服务器                    | 1 × 32 vCPU                     |
| Swoole workers            | 64（每核心 4 个）                |
| 调优前 p95 延迟           | 394 ms                           |
| Octane 后 p95 延迟        | **172 ms（-56%）**               |

作者指出，对于 CPU 密集度较低的应用程序（非 MMORPG），
同一台服务器可以处理**显著更多**的请求。

**来源：** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. 基准测试：PHP-FPM vs Swoole（BytePursuits）

> **测量的是什么：** 仅**有状态运行时**。
> 测试返回 JSON，不访问数据库或外部服务。
> 协程并发在此不涉及 — 没有可以并行执行的 I/O。
> 2.6-3 倍的差异完全是因为 Swoole 不会在每次请求时重新创建应用程序。

基于 Mezzio 微框架的独立基准测试（JSON 响应，无数据库）。
Intel i7-6700T（4 核 / 8 线程），32 GB RAM，wrk，10 秒。

| 并发度     | PHP-FPM (req/s) | Swoole BASE (req/s) | 差异       |
|------------|-----------------|---------------------|------------|
| 100        | 3,472           | 9,090               | **2.6 倍** |
| 500        | 3,218           | 9,159               | **2.8 倍** |
| 1,000      | 3,065           | 9,205               | **3.0 倍** |

1000 并发时的平均延迟：
- FPM：**191 ms**
- Swoole：**106 ms**

**关键点：** 从 500 个并发连接开始，
PHP-FPM 开始丢失请求（500 并发时 73,793 个 socket 错误，700 并发时 176,652 个）。
Swoole 在所有并发级别下**零错误**。

**来源：** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. 基准测试：含数据库（kenashkov）

> **测量的是什么：** 一组具有**不同**效果的测试。
> - Hello World、Autoload — 纯**有状态运行时**（无 I/O）。
> - SQL 查询、真实场景 — **有状态 + 协程**。
> - Swoole 使用基于协程的 MySQL 客户端，允许在等待数据库响应时
> - 服务其他请求。

更真实的测试套件：Swoole 4.4.10 vs Apache + mod_php。
ApacheBench，100-1000 并发，10,000 个请求。

| 场景                                   | Apache (100 并发) | Swoole (100 并发) | 差异       |
|----------------------------------------|--------------------|--------------------|------------|
| Hello World                            | 25,706 req/s       | 66,309 req/s       | **2.6 倍** |
| Autoload 100 个类                      | 2,074 req/s        | 53,626 req/s       | **25 倍**  |
| SQL 查询到数据库                       | 2,327 req/s        | 4,163 req/s        | **1.8 倍** |
| 真实场景（缓存 + 文件 + 数据库）       | 141 req/s          | 286 req/s          | **2.0 倍** |

1000 并发时：
- Apache **崩溃**（连接限制，请求失败）
- Swoole — 所有测试中**零错误**

**关键观察：** 在有真实 I/O（数据库 + 文件）的情况下，差异
从 25 倍降至 **1.8-2 倍**。这是预期的：
数据库成为了共同瓶颈。
但在负载下的稳定性仍然无法相比。

**来源：** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. 基准测试：Symfony 7 — 所有运行时（2024）

> **测量的是什么：** 仅**有状态运行时**。
> 不含数据库的测试 — 不涉及协程。
> 在 1000 并发时 >10 倍的差异是因为 FPM 为每个请求创建
> 一个进程，而 Swoole 和 FrankenPHP 将应用程序保持在内存中
> 并通过事件循环服务连接。

使用 Symfony 7 测试 9 种 PHP 运行时（k6，Docker，1 CPU / 1 GB RAM，无数据库）。

| 运行时                             | vs Nginx + PHP-FPM（1000 并发时） |
|------------------------------------|-------------------------------------|
| Apache + mod_php                   | ~0.5 倍（更慢）                    |
| Nginx + PHP-FPM                    | 1 倍（基准线）                     |
| Nginx Unit                         | ~3 倍                              |
| RoadRunner                         | >2 倍                              |
| **Swoole / FrankenPHP (worker)**   | **>10 倍**                         |

在 1000 个并发连接时，Swoole 和 FrankenPHP 的 worker 模式
表现出比经典 Nginx + PHP-FPM **高一个数量级的吞吐量**。

**来源：** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower：Swoole — PHP 类别第一名

> **测量的是什么：** **有状态 + 协程**（在数据库测试中）。
> TechEmpower 包括 JSON 测试（有状态）和多条 SQL 查询的测试
> （多查询、Fortunes），其中基于协程的数据库访问
> 提供了真正的优势。这是协程效果最明显的
> 少数基准测试之一。

在 [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
（Round 22，2023）中，Swoole 在所有 PHP 框架的
MySQL 测试中获得**第一名**。

TechEmpower 测试真实场景：JSON 序列化、
单条数据库查询、多条查询、ORM、Fortunes
（模板 + 数据库 + 排序 + 转义）。

**来源：** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf：基于 Swoole 框架的 96,000 req/s

> **测量的是什么：** **有状态运行时**（基准测试为 Hello World）。
> Hyperf 完全构建在 Swoole 协程之上，在生产中
> 协程并发用于数据库、Redis 和 gRPC 调用。
> 然而，96K req/s 的数据是在无 I/O 的 Hello World 上获得的，
> 意味着它反映的是有状态运行时效果。

[Hyperf](https://hyperf.dev/) 是一个构建在 Swoole 之上的基于协程的 PHP 框架。
在基准测试（4 线程，100 连接）中：

- **96,563 req/s**
- 延迟：7.66 ms

Hyperf 定位于微服务，声称
比传统 PHP 框架有 **5-10 倍**的优势。

**来源：** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## 总结：真实数据显示了什么

| 测试类型                         | FPM → Swoole                    | 主要效果         | 备注                                          |
|----------------------------------|---------------------------------|------------------|-----------------------------------------------|
| Hello World / JSON               | **2.6-3 倍**                    | 有状态           | BytePursuits、kenashkov                       |
| Autoload（有状态 vs 无状态）     | **25 倍**                       | 有状态           | 无 I/O — 纯状态保持效果                       |
| 含数据库                         | **1.8-2 倍**                    | 有状态 + 协程    | kenashkov（协程 MySQL）                       |
| 生产 API（Appwrite）             | **+91%**（1.85 倍）             | 有状态 + 协程    | I/O 代理，两个因素                            |
| 生产（IdleMMO）                  | p95：**-56%**                   | 有状态           | Octane workers，非协程                        |
| 高并发（1000+）                  | **Swoole 稳定，FPM 崩溃**      | 事件循环         | 所有基准测试                                  |
| Symfony 运行时（1000 并发）      | **>10 倍**                      | 有状态           | 测试中无数据库                                |
| TechEmpower（数据库测试）        | **PHP 类别第一**                | 有状态 + 协程    | 多条 SQL 查询                                 |

## 与理论的关联

结果与 [IO 密集型任务效率](/zh/docs/evidence/concurrency-efficiency.html)中的计算很好地吻合：

**1. 含数据库时差异更温和（1.8-2 倍），不含时更大（3-10 倍）。**
这证实了：在有真实 I/O 时，瓶颈变成了数据库本身，
而非并发模型。数据库测试中的阻塞系数更低，
因为框架的 CPU 工作量与 I/O 时间相当。

**2. 在高并发（500-1000+）下，FPM 性能下降而 Swoole 不会。**
PHP-FPM 受限于 worker 数量。每个 worker 是一个操作系统进程（约 40 MB）。
在 500+ 并发连接时，FPM 达到极限
并开始丢失请求。Swoole 在数十个协程中服务数千个连接，
而不增加内存消耗。

**3. 有状态运行时消除了重新初始化开销。**
autoload 测试中 25 倍的差异展示了
FPM 中每次请求重新创建应用程序状态的代价。
在生产中，这体现为 T_cpu = 34 ms（FPM）
与 T_cpu = 5-10 ms（有状态）的差异，这极大地改变了阻塞系数，
从而影响协程带来的收益
（参见 [IO 密集型任务效率中的表格](/zh/docs/evidence/concurrency-efficiency.html)）。

**4. 公式得到验证。**
Appwrite：FPM 436 req/s → Swoole 808 req/s（1.85 倍）。
如果 T_cpu 从约 30 ms 降至约 15 ms（有状态），
而 T_io 保持约 30 ms，那么阻塞系数从 1.0 增加到 2.0，
预测吞吐量增加约 1.5-2 倍。这与实际相符。

## 参考文献

### 生产案例
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### 独立基准测试
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### 框架和运行时
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — 基于协程的 PHP 框架](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
