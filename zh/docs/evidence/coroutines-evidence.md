---
layout: docs
lang: zh
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /zh/docs/evidence/coroutines-evidence.html
page_title: "为什么协程有效"
description: "实证依据：上下文切换成本测量、内存比较、C10K 问题、学术研究。"
---

# 实证依据：为什么单线程协程有效

单线程协作式并发对 IO 密集型工作负载有效这一论断，
得到了测量数据、学术研究和大规模系统运营经验的支持。

---

## 1. 切换成本：协程 vs 操作系统线程

协程的主要优势在于协作式切换在用户空间中进行，
无需调用操作系统内核。

### Linux 上的测量数据

| 指标                 | 操作系统线程 (Linux NPTL)                | 协程 / 异步任务                        |
|----------------------|------------------------------------------|----------------------------------------|
| 上下文切换           | 1.2–1.5 µs（固定核心），~2.2 µs（非固定）| ~170 ns (Go)，~200 ns (Rust async)     |
| 任务创建             | ~17 µs                                   | ~0.3 µs                               |
| 每个任务的内存       | ~9.5 KiB（最小），8 MiB（默认栈）        | ~0.4 KiB (Rust)，2–4 KiB (Go)         |
| 可扩展性             | ~80,000 个线程（测试）                   | 250,000+ 个异步任务（测试）            |

**来源：**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  Linux 线程切换成本的直接测量以及与 goroutine 的比较
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  异步任务切换约 0.2 µs vs 线程约 1.7 µs（快 **8.5 倍**），
  创建时间 0.3 µs vs 17 µs（快 **56 倍**），内存占用 0.4 KiB vs 9.5 KiB（少 **24 倍**）

### 这在实践中意味着什么

切换一个协程的成本约为 **200 纳秒** — 比
切换操作系统线程（约 1.5 µs）便宜一个数量级。
但更重要的是，协程切换**不会产生间接成本**：
TLB 缓存刷新、分支预测器失效、跨核心迁移 —
所有这些都是线程的特征，但不存在于单线程内的协程中。

对于每个核心处理 80 个协程的事件循环，
总切换开销为：

```
80 × 200 ns = 16 µs 完成所有协程的一个完整循环
```

相比 80 ms 的 I/O 等待时间，这可以忽略不计。

---

## 2. 内存：差异的量级

操作系统线程分配固定大小的栈（Linux 上默认为 8 MiB）。
协程仅存储其状态 — 局部变量和恢复点。

| 实现                            | 每个并发单元的内存                                |
|---------------------------------|---------------------------------------------------|
| Linux 线程（默认栈）            | 8 MiB 虚拟内存，最小约 10 KiB RSS                 |
| Go goroutine                    | 2–4 KiB（动态栈，按需增长）                       |
| Kotlin 协程                     | 堆上数十字节；线程:协程比率约 6:1                  |
| Rust 异步任务                   | ~0.4 KiB                                          |
| C++ 协程帧 (Pigweed)            | 88–408 字节                                       |
| Python asyncio 协程             | ~2 KiB（vs 线程的约 5 KiB + 32 KiB 栈）           |

**来源：**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — 6:1 的内存比率
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — Python 中的比较
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — 动态 goroutine 栈

### 对 Web 服务器的影响

对于 640 个并发任务（8 核 × 80 个协程）：

- **操作系统线程**：640 × 8 MiB = 5 GiB 虚拟内存
  （实际上由于延迟分配会更少，但对操作系统调度器的压力很大）
- **协程**：640 × 4 KiB = 2.5 MiB
  （相差**三个数量级**）

---

## 3. C10K 问题与真实服务器

### 问题

1999 年，Dan Kegel 提出了
[C10K 问题](https://www.kegel.com/c10k.html)：
使用"每连接一个线程"模型的服务器无法服务
10,000 个同时连接。
原因不是硬件限制，而是操作系统线程的开销。

### 解决方案

该问题通过转向事件驱动架构得到解决：
不再为每个连接创建线程，
而是用单个事件循环在一个线程中服务数千个连接。

这正是 **nginx**、**Node.js**、**libuv** 以及 — 在 PHP 语境下 — **True Async** 所实现的方法。

### 基准测试：nginx（事件驱动）vs Apache（每请求一线程）

| 指标（1000 并发连接）          | nginx        | Apache                           |
|-------------------------------|--------------|----------------------------------|
| 每秒请求数（静态）            | 2,500–3,000  | 800–1,200                        |
| HTTP/2 吞吐量                 | >6,000 req/s | ~826 req/s                       |
| 负载下的稳定性                | 稳定         | 超过 150 连接时性能下降          |

nginx 处理的请求数是 Apache 的 **2-4 倍**，
同时消耗的内存明显更少。
Apache 使用每请求一线程的架构，默认最多接受 150 个同时连接，
超过后新客户端需要排队等待。

**来源：**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — 问题的提出
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — 基准测试
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — 行业经验

---

## 4. 学术研究

### SEDA：分阶段事件驱动架构（Welsh 等，2001）

加州大学伯克利分校的 Matt Welsh、David Culler 和 Eric Brewer 提出了
SEDA — 一种基于事件和处理阶段之间队列的服务器架构。

**关键结果**：Java 实现的 SEDA 服务器在 10,000+ 同时连接下，
吞吐量超过了 Apache（C 语言，每连接一线程）。
Apache 无法接受超过 150 个同时连接。

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Web 服务器架构比较（Pariag 等，2007）

最彻底的架构比较由滑铁卢大学的 Pariag 等人完成。
他们在相同的代码基础上比较了三种服务器：

- **µserver** — 事件驱动（SYMPED，单进程）
- **Knot** — 每连接一线程（Capriccio 库）
- **WatPipe** — 混合型（流水线，类似 SEDA）

**关键结果**：事件驱动的 µserver 和流水线型 WatPipe
比基于线程的 Knot 提供了**高约 18% 的吞吐量**。
WatPipe 需要 25 个写入线程才能达到
µserver 用 10 个进程所达到的相同性能。

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream：使用协程加速事件处理（2022）

一项发表在 arXiv 上的研究对流数据处理（基于事件的处理）
中的协程和线程进行了直接比较。

**关键结果**：在事件流处理中，协程的吞吐量
是传统线程的**至少 2 倍**。

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. 可扩展性：100,000 个任务

### Kotlin：100 ms 内创建 100,000 个协程

在 [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
的基准测试中，创建和启动 100,000 个协程的开销约为 100 ms。
等量的线程仅创建就需要约 1.7 秒
（100,000 × 17 µs），栈内存需要约 950 MiB。

### Rust：250,000 个异步任务

在 [context-switch 基准测试](https://github.com/jimblandy/context-switch)中，
在单个进程中启动了 250,000 个异步任务，
而操作系统线程在约 80,000 时就达到了极限。

### Go：数百万个 Goroutine

Go 在生产系统中常规启动数十万甚至数百万个 goroutine。
这使得 Caddy、Traefik 和 CockroachDB 等服务器
能够处理数万个同时连接。

---

## 6. 证据总结

| 论断                                          | 确认                                              |
|-----------------------------------------------|---------------------------------------------------|
| 协程切换比线程更便宜                           | ~200 ns vs ~1500 ns — **7-8 倍** (Bendersky 2018, Blandy) |
| 协程消耗更少内存                               | 0.4–4 KiB vs 9.5 KiB–8 MiB — **24 倍以上** (Blandy, Go FAQ) |
| 事件驱动服务器扩展性更好                       | nginx 吞吐量是 Apache 的 2-4 倍（基准测试）       |
| 事件驱动 > 每连接一线程（学术层面）            | 吞吐量高 18% (Pariag 2007)，C10K 问题已解决 (Kegel 1999) |
| 协程 > 线程（事件处理）                        | 2 倍吞吐量 (AEStream 2022)                        |
| 单进程中数十万个协程                           | 250K 异步任务 (Rust)，100 ms 内 100K 协程 (Kotlin) |
| 公式 N ≈ 1 + T_io/T_cpu 是正确的              | Goetz 2006, Zalando, Little 定律                   |

---

## 参考文献

### 测量与基准测试
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### 学术论文
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### 行业经验
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### 另请参阅
- [Python asyncio 实践](/zh/docs/evidence/python-evidence.html) — 生产案例（Duolingo、Super.com、Instagram），uvloop 基准测试，Cal Paterson 的反面论据
- [Swoole 实践](/zh/docs/evidence/swoole-evidence.html) — PHP 协程的生产案例和基准测试
