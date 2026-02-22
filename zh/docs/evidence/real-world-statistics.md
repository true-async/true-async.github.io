---
layout: docs
lang: zh
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /zh/docs/evidence/real-world-statistics.html
page_title: "并发统计数据"
description: "用于并发计算的真实统计数据：SQL 查询数、数据库延迟、PHP 框架吞吐量。"
---

# 并发计算的统计数据

[IO 密集型任务效率](/zh/docs/evidence/concurrency-efficiency.html)部分的公式基于
几个关键量。以下是真实测量数据的汇总，
使您能够将具体数值代入公式中。

---

## 公式要素

Little 定律：

$$
L = \lambda \cdot W
$$

- `L` — 所需的并发级别（同时有多少任务）
- `λ` — 吞吐量（每秒请求数）
- `W` — 处理一个请求的平均时间

Goetz 公式：

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — 每个请求的 I/O 等待时间
- `T_cpu` — 每个请求的 CPU 计算时间

进行实际计算需要了解：

1. **每个 HTTP 请求执行多少条 SQL 查询**
2. **一条 SQL 查询需要多长时间（I/O）**
3. **CPU 处理需要多长时间**
4. **服务器吞吐量是多少**
5. **总响应时间是多少**

---

## 1. 每个 HTTP 请求的 SQL 查询数

数据库调用次数取决于框架、ORM 和页面复杂度。

| 应用 / 框架                       | 每页查询数          | 来源                                                                                                            |
|------------------------------------|---------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress（无插件）                | ~17                 | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, 普通页面)       | <30（性能分析器阈值）| [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                        |
| Laravel（简单 CRUD）               | 5–15                | 来自 Laravel Debugbar 的典型值                                                                                   |
| Laravel（存在 N+1 问题时）         | 20–50+              | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal（无缓存）                   | 80–100              | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento（商品目录）                | 50–200+             | 复杂电商系统的典型值                                                                                             |

**典型 ORM 应用程序的中位数：每个 HTTP 请求 15-30 条查询。**

Symfony 使用 30 条查询作为"正常"的边界值 — 超过时，
性能分析器图标变为黄色。

## 2. 每条 SQL 查询的时间（每条查询的 T_io）

### 数据库服务器上的查询执行时间

来自 Percona 的 sysbench OLTP 基准测试数据（MySQL）：

| 并发度      | <0.1 ms 的查询占比 | 0.1–1 ms | 1–10 ms | >10 ms |
|-------------|---------------------|----------|---------|--------|
| 1 个线程    | 86%                 | 10%      | 3%      | 1%     |
| 32 个线程   | 68%                 | 30%      | 2%      | <1%    |
| 128 个线程  | 52%                 | 35%      | 12%     | 1%     |

LinkBench（Percona，近似真实 Facebook 工作负载）：

| 操作          | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0.4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0.7 ms | 47 ms | 100 ms |

**来源：** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### 网络延迟（往返时间）

| 场景                   | 往返时间   | 来源 |
|------------------------|------------|------|
| Unix-socket / localhost | <0.1 ms   | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| 局域网，单数据中心      | ~0.5 ms   | CYBERTEC PostgreSQL |
| 云环境，跨可用区        | 1–5 ms    | CYBERTEC PostgreSQL |
| 跨区域                  | 10–50 ms  | 典型值 |

### 总计：单条 SQL 查询的完整时间

完整时间 = 服务器端执行时间 + 网络往返时间。

| 环境              | 简单 SELECT (p50) | 平均查询 (p50)  |
|-------------------|---------------------|---------------------|
| Localhost          | 0.1–0.5 ms         | 0.5–2 ms            |
| 局域网（单 DC）    | 0.5–1.5 ms         | 1–4 ms              |
| 云环境（跨 AZ）    | 2–6 ms             | 3–10 ms             |

对于云环境，**每条平均查询 4 ms** 是一个有充分依据的估计。

## 3. 每条 SQL 查询的 CPU 时间（每条查询的 T_cpu）

CPU 时间涵盖：结果解析、ORM 实体水合、
对象映射、序列化。

该特定值在公开来源中的直接基准测试很少，
但可以从性能分析器数据中估算：

- Blackfire.io 将总时间分为 **I/O 时间** 和 **CPU 时间**
  （[Blackfire: Time](https://blackfire.io/docs/reference-guide/time)）
- 在典型的 PHP 应用程序中，数据库是主要瓶颈，
  CPU 时间仅占总时间的一小部分
  （[Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/)）

**通过吞吐量的间接估算：**

使用 Doctrine 的 Symfony（数据库 + Twig 渲染）处理约 1000 req/s
（[Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)）。
这意味着每个请求的 CPU 时间约为 1 ms。
每页约 20 条 SQL 查询 → **每条 SQL 查询约 0.05 ms CPU**。

Laravel API 端点（Sanctum + Eloquent + JSON）→ 约 440 req/s
（[Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)）。
每个请求的 CPU 时间约为 2.3 ms。约 15 条查询 → **每条 SQL 查询约 0.15 ms CPU**。

## 4. PHP 应用程序的吞吐量（λ）

在 30 vCPU / 120 GB RAM 上运行的基准测试，nginx + PHP-FPM，
15 个并发连接（[Kinsta](https://kinsta.com/blog/php-benchmarks/)，
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)）：

| 应用        | 页面类型                | req/s (PHP 8.4) |
|-------------|------------------------|-----------------|
| Laravel     | Welcome（无数据库）     | ~700            |
| Laravel     | API + Eloquent + Auth  | ~440            |
| Symfony     | Doctrine + Twig        | ~1,000          |
| WordPress   | 首页（无插件）          | ~148            |
| Drupal 10   | —                      | ~1,400          |

注意 WordPress 明显更慢，
因为每个请求更重（更多 SQL 查询，更复杂的渲染）。

---

## 5. 生产环境中的总响应时间（W）

来自 LittleData 的数据（2023 年，2,800 个电商网站）：

| 平台                     | 平均服务器响应时间        |
|--------------------------|--------------------------|
| Shopify                  | 380 ms                   |
| 电商平均值               | 450 ms                   |
| WooCommerce (WordPress)  | 780 ms                   |
| Magento                  | 820 ms                   |

**来源：** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

行业基准：

| 类别              | API 响应时间    |
|-------------------|----------------|
| 优秀              | 100–300 ms     |
| 可接受            | 300–600 ms     |
| 需要优化          | >600 ms        |

## 使用 Little 定律的实际计算

### 场景 1：云环境中的 Laravel API

**输入数据：**
- λ = 440 req/s（目标吞吐量）
- W = 80 ms（计算值：20 条 SQL × 4 ms I/O + 1 ms CPU）
- 核心数：8

**计算：**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ 个并发任务}
$$

在 8 个核心上，约为每核心 4.4 个任务。这与 Laravel 使用 15 个并发
PHP-FPM worker 已达到 440 req/s 的事实一致。还有提升空间。

### 场景 2：云环境中的 Laravel API，2000 req/s（目标）

**输入数据：**
- λ = 2000 req/s（目标吞吐量）
- W = 80 ms
- 核心数：8

**计算：**

$$
L = 2000 \times 0.080 = 160 \text{ 个并发任务}
$$

PHP-FPM 无法在 8 个核心上运行 160 个 worker — 每个 worker 是一个独立进程，
占用约 30-50 MB 内存。总计：仅 worker 就需要约 6-8 GB。

使用协程：160 个任务 × ~4 KiB ≈ **640 KiB**。相差**四个数量级**。

### 场景 3：使用 Goetz 公式

**输入数据：**
- T_io = 80 ms（20 条查询 × 4 ms）
- T_cpu = 1 ms
- 核心数：8

**计算：**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ 个协程}
$$

**吞吐量**（通过 Little 定律）：

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

这是充分利用 8 个核心时的理论上限。
在实践中，由于调度器开销、GC、连接池限制，实际值会更低。
但即使是该值的 50%（4,000 req/s）
也是同样 8 核上 PHP-FPM 的 440 req/s 的**一个数量级以上**。

## 总结：数据从何而来

| 量                                | 值               | 来源                                      |
|-----------------------------------|------------------|-------------------------------------------|
| 每个 HTTP 请求的 SQL 查询数       | 15–30            | WordPress ~17，Symfony 阈值 <30           |
| 每条 SQL 查询时间（云环境）       | 3–6 ms           | Percona p50 + CYBERTEC 往返时间           |
| 每条 SQL 查询 CPU 时间            | 0.05–0.15 ms     | 从吞吐量基准测试反向计算                  |
| Laravel 吞吐量                    | ~440 req/s (API) | Sevalla/Kinsta 基准测试，PHP 8.4          |
| 电商响应时间（平均）              | 450 ms           | LittleData，2,800 个网站                  |
| API 响应时间（规范）              | 100–300 ms       | 行业基准                                  |

---

## 参考文献

### PHP 框架基准测试
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — WordPress、Laravel、Symfony、Drupal 的吞吐量
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API 端点

### 数据库基准测试
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — 每个操作的 p50/p95/p99
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — 不同并发度下的延迟分布
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — 不同环境下的网络延迟
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — 阈值 <10ms / >100ms

### 生产系统响应时间
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2,800 个电商网站

### PHP 性能分析
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — 总时间分解为 I/O 和 CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — PHP 应用程序的 APM
