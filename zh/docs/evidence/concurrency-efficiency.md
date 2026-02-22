---
layout: docs
lang: zh
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /zh/docs/evidence/concurrency-efficiency.html
page_title: "IO 密集型 vs CPU 密集型"
description: "IO 密集型和 CPU 密集型任务的并发效率分析。Little 定律、Goetz 公式、计算最优协程数量。"
---

# IO 密集型 vs CPU 密集型

并发或并行能带来多大的性能提升，取决于工作负载的性质。
在服务器应用程序中，通常区分两种主要类型的任务。

- **IO 密集型** — 任务的大部分时间花在等待输入/输出操作上：
  网络请求、数据库查询、读写文件。在这些时刻，CPU 处于空闲状态。
- **CPU 密集型** — 需要密集计算的任务，几乎始终保持处理器忙碌：
  复杂算法、数据处理、加密运算。

近年来，大多数 Web 应用程序已转向 **IO 密集型**工作负载。
这是由微服务、远程 `API` 和云服务的增长所驱动的。
Frontend for Backend（`BFF`）和 `API Gateway` 等从多个来源聚合数据的方式，
进一步放大了这一效果。

现代服务器应用程序也难以想象没有日志记录、遥测
和实时监控。所有这些操作本质上都是 IO 密集型的。

## IO 密集型任务的效率

`IO 密集型`任务并发执行的效率取决于
任务实际使用 `CPU` 的时间占比
与等待 I/O 操作完成所花费时间的对比。

### Little 定律

在排队论中，一个基本公式
是 Little 定律（[Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)）：

$$
L = \lambda \cdot W
$$

其中：
- `L` — 系统中的平均任务数
- `λ` — 平均请求到达速率
- `W` — 任务在系统中的平均停留时间

该定律是通用的，不依赖于具体的系统实现：
无论使用线程、协程还是异步回调都无关紧要。
它描述了负载、延迟和并发级别之间的基本关系。

在估算服务器应用程序的并发度时，本质上是在解决
同时有多少任务必须在系统中才能高效利用资源的问题。

对于 `IO 密集型`工作负载，平均请求处理时间
远大于活跃计算所花费的时间。
因此，要使 CPU 不空闲，系统中必须有
足够数量的并发任务。

这正是形式化分析允许我们估算的量，
通过关联：
- 等待时间、
- 吞吐量、
- 以及所需的并发级别。

工业界也使用类似的方法来计算
最优线程池大小（参见 Brian Goetz，*"Java Concurrency in Practice"*）。

> 这些公式各要素的实际统计数据
> （每个 HTTP 请求的 SQL 查询数、数据库延迟、PHP 框架吞吐量）
> 收集在单独的文档中：
> [并发计算的统计数据](/zh/docs/evidence/real-world-statistics.html)。

### 基本 CPU 利用率

要计算执行单个任务时处理器
实际做有用工作的时间占比，可以使用以下公式：

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` — 在 CPU 上执行计算所花费的时间
- `T_io` — 等待 I/O 操作所花费的时间

`T_cpu + T_io` 之和代表任务从开始到完成的总生命周期。

`U` 的值范围从 0 到 1，表示处理器利用的程度：
- `U → 1` 表征计算密集型（`CPU 密集型`）任务
- `U → 0` 表征大部分时间在等待 I/O 的任务（`IO 密集型`）

因此，该公式提供了对
`CPU` 使用效率以及工作负载是 `IO 密集型`还是 `CPU 密集型`的定量评估。

### 并发的影响

当并发执行多个 `IO 密集型`任务时，`CPU` 可以利用
一个任务的 `I/O` 等待时间来执行**另一个**任务的计算。

使用 `N` 个并发任务时的 CPU 利用率可以估算为：

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

增加并发度可以提高 `CPU` 利用率，
但仅限于一定的极限。

### 效率极限

并发带来的最大收益受限于
`I/O` 等待时间与计算时间的比率：

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

在实践中，这意味着真正有用的
并发任务数量大约等于 `T_io / T_cpu` 的比值。

### 最优并发度

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

公式中的 1 代表当前正在 `CPU` 上执行的任务。
当 `T_io / T_cpu` 比率很大时（这对 `IO 密集型`工作负载是典型的），
1 的贡献可以忽略不计，公式通常简化为 `T_io / T_cpu`。

该公式是 Brian Goetz 在
*"Java Concurrency in Practice"*（2006）一书中提出的经典
最优线程池大小公式的特例（针对单核心）：

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

`T_wait / T_service` 的比值被称为**阻塞系数**。
该系数越高，单个核心可以有效利用的并发任务就越多。

在这个并发级别下，处理器将大部分时间
花在做有用的工作上，进一步增加任务数量
不再带来明显的收益。

这正是为什么异步执行模型
对 `IO 密集型` Web 工作负载最为有效。

## 典型 Web 应用程序的计算示例

让我们考虑一个简化但相当现实的平均服务器端 Web 应用程序模型。
假设处理单个 `HTTP` 请求主要涉及与数据库的交互，
不包含计算密集型操作。

### 初始假设

- 每个 HTTP 请求大约执行 **20 条 SQL 查询**
- 计算仅限于数据映射、响应序列化和日志记录
- 数据库在应用程序进程外部（远程 I/O）

> **为什么是 20 条查询？**
> 这是中等复杂度 ORM 应用程序的中位数估计。
> 作为对比：
> * WordPress 每页生成约 17 条查询，
> * 不使用缓存的 Drupal — 80 到 100 条，
> * 而典型的 Laravel/Symfony 应用程序 — 10 到 30 条。
>
> 增长的主要来源是 N+1 模式，其中 ORM 使用单独的查询
> 加载关联实体。

### 执行时间估算

为了估算，我们使用平均值：

- 一条 SQL 查询：
    - I/O 等待时间：`T_io ≈ 4 ms`
    - CPU 计算时间：`T_cpu ≈ 0.05 ms`

每个 HTTP 请求的总计：

- `T_io = 20 × 4 ms = 80 ms`
- `T_cpu = 20 × 0.05 ms = 1 ms`

> **关于所选的延迟值。**
> 单条 `SQL` 查询的 I/O 时间由网络延迟（`round-trip`）
> 和数据库服务器上的查询执行时间组成。
> 单个数据中心内的网络往返约为 0.5 ms，
> 而在云环境中（跨可用区、托管 RDS）为 1-5 ms。
> 考虑到中等复杂度查询的执行时间，
> 每条查询 4 ms 是云环境下的合理估计。
> CPU 时间（0.05 ms）涵盖 ORM 结果映射、实体水合
> 和基本处理逻辑。

### 工作负载特征

等待时间与计算时间的比率：

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

这意味着任务主要是 **IO 密集型**的：
处理器大部分时间处于空闲状态，
等待 I/O 操作完成。

### 估算协程数量

每个 CPU 核心的最优并发协程数
大约等于 I/O 等待时间与计算时间的比率：

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

换句话说，大约 **每核心 80 个协程**可以几乎完全
隐藏 I/O 延迟，同时保持较高的 CPU 利用率。

作为对比：[Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
提供了一个微服务示例，其响应时间为 50 ms，处理时间为 5 ms，
在双核机器上：`2 × (1 + 50/5) = 22 个线程` — 相同的原理，相同的公式。

### 按核心数扩展

对于拥有 `C` 个核心的服务器：

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

例如，对于 8 核处理器：

$$
N_{total} \approx 8 \times 80 = 640 \text{ 个协程}
$$

该值反映的是**有用的并发级别**，
而非硬性限制。

### 对环境的敏感性

每核心 80 个协程不是一个通用常数，
而是基于 I/O 延迟的特定假设的结果。
根据网络环境的不同，最优并发任务数
可能有显著差异：

| 环境                     | 每条 SQL 查询的 T_io | T_io 总计 (×20) | 每核心 N 值 |
|--------------------------|----------------------|------------------|------------|
| Localhost / Unix-socket  | ~0.1 ms              | 2 ms             | ~2         |
| 局域网（单数据中心）      | ~1 ms                | 20 ms            | ~20        |
| 云环境（跨可用区、RDS）   | ~4 ms                | 80 ms            | ~80        |
| 远程服务器 / 跨区域       | ~10 ms               | 200 ms           | ~200       |

延迟越大，需要越多的协程
来让 CPU 充分做有用的工作。

### PHP-FPM vs 协程：近似计算

为了估算协程的实际收益，
让我们在同一服务器上使用相同的工作负载
比较两种执行模型。

#### 初始数据

**服务器：** 8 核，云环境（跨可用区 RDS）。

**工作负载：** 典型的 Laravel API 端点 —
授权、Eloquent 预加载查询、JSON 序列化。

基于
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
和 [Kinsta](https://kinsta.com/blog/php-benchmarks/) 的基准测试数据：

| 参数                                       | 值         | 来源              |
|-------------------------------------------|------------|-------------------|
| Laravel API 吞吐量（30 vCPU，localhost DB） | ~440 req/s | Sevalla, PHP 8.3  |
| 基准测试中的 PHP-FPM worker 数              | 15         | Sevalla           |
| 基准测试中的响应时间 (W)                     | ~34 ms     | L/λ = 15/440      |
| 每个 PHP-FPM worker 的内存                  | ~40 MB     | 典型值            |

#### 第 1 步：估算 T_cpu 和 T_io

在 **Sevalla** 基准测试中，数据库运行在 localhost 上（延迟 <0.1 ms）。
大约 10 条 SQL 查询，总 I/O 不到 1 ms。

已知：
- 吞吐量：λ ≈ 440 req/s
- 同时处理的请求数（PHP-FPM workers）：L = 15
- 数据库在 localhost 上，因此 T_io ≈ 0

根据 Little 定律：

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0.034 \, \text{s} \approx 34 \, \text{ms}
$$

由于在此基准测试中数据库运行在 `localhost` 上
且总 `I/O` 不到 1 ms，
因此得出的平均响应时间几乎完全反映
每个请求的 `CPU` 处理时间：

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

这意味着在 `localhost` 条件下，几乎所有响应时间（约 34 ms）都是 `CPU` 耗时：
框架、`middleware`、`ORM`、序列化。


让我们将同一端点移至 **云环境**，使用 20 条 `SQL` 查询：

$$
T_{cpu} = 34 \text{ ms（框架 + 逻辑）}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms（数据库等待时间）}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

阻塞系数：

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2.4
$$

#### 第 2 步：PHP-FPM

在 `PHP-FPM` 模型中，每个 worker 是一个独立的操作系统进程。
在 `I/O` 等待期间，worker 被阻塞，无法处理其他请求。

要充分利用 8 个核心，需要足够的 worker 数量，
使得在任意时刻有 8 个 worker 正在执行 `CPU` 工作：

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3.4 = 27
$$

| 指标                            | 值            |
|---------------------------------|---------------|
| Workers 数量                    | 27            |
| 内存 (27 × 40 MB)              | **1.08 GB**   |
| 吞吐量 (27 / 0.114)            | **237 req/s** |
| CPU 利用率                      | ~100%         |

在实践中，管理员通常设置 `pm.max_children = 50-100`，
高于最优值。多余的 worker 会争抢 CPU，
增加操作系统上下文切换次数，
并消耗内存而不增加吞吐量。

#### 第 3 步：协程（事件循环）

在协程模型中，每个核心使用一个线程来服务
多个请求。当协程等待 I/O 时，
调度器在约 200 纳秒内切换到另一个协程
（参见[证据基础](/zh/docs/evidence/coroutines-evidence.html)）。

最优协程数量相同：

$$
N_{coroutines} = 8 \times 3.4 = 27
$$

| 指标                   | 值            |
|------------------------|---------------|
| 协程数量               | 27            |
| 内存 (27 × ~2 MiB)    | **54 MiB**    |
| 吞吐量                 | **237 req/s** |
| CPU 利用率             | ~100%         |

吞吐量**相同** — 因为 CPU 是瓶颈。
但并发所需的内存：**54 MiB vs 1.08 GB** — 相差 **约 20 倍**。

> **关于协程栈大小。**
> PHP 中协程的内存占用由预留的 C 栈大小决定。
> 默认值约为 2 MiB，但可以减小到 128 KiB。
> 使用 128 KiB 的栈，27 个协程的内存仅约 3.4 MiB。

#### 第 4 步：如果 CPU 负载更低？

`Laravel` 框架在 `FPM` 模式下每个请求花费约 34 ms 的 `CPU` 时间，
其中包括每次请求时服务的重新初始化。

在有状态运行时（`True Async` 就是这样），这些开销显著降低：
路由已编译，依赖注入容器已初始化，
连接池被复用。

如果 `T_cpu` 从 34 ms 降至 5 ms（这对有状态模式是现实的），
情况会发生巨大变化：

| T_cpu | 阻塞系数 | N (8 核心) | λ (req/s) | 内存 (FPM) | 内存（协程） |
|-------|---------|-----------|-----------|------------|-------------|
| 34 ms | 2.4     | 27        | 237       | 1.08 GB    | 54 MiB      |
| 10 ms | 8       | 72        | 800       | 2.88 GB    | 144 MiB     |
| 5 ms  | 16      | 136       | 1 600     | 5.44 GB    | 272 MiB     |
| 1 ms  | 80      | 648       | 8 000     | **25.9 GB**| **1.27 GiB**|

当 `T_cpu = 1 ms`（轻量级处理器，最小开销）时：
- PHP-FPM 需要 **648 个进程和 25.9 GB RAM** — 不现实
- 协程需要同样的 648 个任务和 **1.27 GiB** — **少约 20 倍**

#### 第 5 步：Little 定律 — 通过吞吐量验证

让我们验证 `T_cpu = 5 ms` 的结果：

$$
\lambda = \frac{L}{W} = \frac{136}{0.085} = 1\,600 \text{ req/s}
$$

要达到相同的吞吐量，PHP-FPM 需要 136 个 worker。
每个占用约 40 MB：

$$
136 \times 40 \text{ MB} = 5.44 \text{ GB 仅用于 worker}
$$

协程：

$$
136 \times 2 \text{ MiB} = 272 \text{ MiB}
$$

释放的约 5.2 GB 可以用于缓存、
数据库连接池或处理更多请求。

#### 总结：协程何时提供收益

| 条件                                       | 协程带来的收益                                                   |
|-------------------------------------------|------------------------------------------------------------------|
| 重量级框架，localhost 数据库 (T_io ≈ 0)    | 最小 — 工作负载是 CPU 密集型                                      |
| 重量级框架，云数据库 (T_io = 80 ms)        | 中等 — 在相同吞吐量下节省约 20 倍内存                             |
| 轻量级处理器，云数据库                      | **最大** — 吞吐量提升高达 13 倍，节省约 20 倍内存                 |
| 微服务 / API Gateway                      | **最大** — 几乎纯 I/O，单台服务器数万 req/s                      |

**结论：** I/O 在总请求时间中的占比越大，CPU 处理越轻量，
协程带来的收益就越大。
对于 IO 密集型应用程序（这是大多数现代 Web 服务），
协程允许将同一 CPU 的利用效率提高数倍，
同时消耗的内存减少数个数量级。

### 实践注意事项

- 将协程数量增加到最优级别以上很少带来收益，
  但也不是问题：协程是轻量级的，"额外"
  协程的开销与操作系统线程的成本相比微不足道
- 真正的限制变成了：
    - 数据库连接池
    - 网络延迟
    - 反压机制
    - 打开文件描述符限制（ulimit）
- 对于此类工作负载，*事件循环 + 协程*模型被证明
  比经典的阻塞模型高效得多

### 结论

对于典型的现代 Web 应用程序，
其中 I/O 操作占主导地位，
异步执行模型允许您：
- 有效隐藏 I/O 延迟
- 显著提高 CPU 利用率
- 减少对大量线程的需求

正是在这些场景下，异步的优势
得到了最清晰的展示。

---

### 延伸阅读

- [Swoole 实践：真实测量数据](/zh/docs/evidence/swoole-evidence.html) — 生产案例（Appwrite +91%，IdleMMO 3500 万请求/天），独立基准测试（含/不含数据库），TechEmpower
- [Python asyncio 实践](/zh/docs/evidence/python-evidence.html) — Duolingo +40%，Super.com 成本降低 90%，uvloop 基准测试，反面论据
- [证据基础：为什么单线程协程有效](/zh/docs/evidence/coroutines-evidence.html) — 上下文切换成本测量，与操作系统线程的比较，学术研究和行业基准

---

### 参考文献

- Brian Goetz, *Java Concurrency in Practice* (2006) — 最优线程池大小公式：`N = cores × (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) — Goetz 公式的实际应用，包含示例和通过 Little 定律的推导
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) — 考虑目标 CPU 利用率的公式详细分析
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — 网络延迟对 PostgreSQL 性能影响的测量
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — Web 应用程序中可接受的 SQL 查询延迟指南
