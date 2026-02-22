---
layout: docs
lang: zh
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /zh/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio 实践：Duolingo、Super.com、Instagram、uvloop 基准测试、反面论据。"
---

# Python asyncio 实践：真实测量数据

Python 是在执行模型方面与 PHP 最相似的语言：
解释型、单线程（GIL）、同步框架占主导地位。
从同步 Python（Flask、Django + Gunicorn）到异步
（FastAPI、aiohttp、Starlette + Uvicorn）的过渡，
是从 PHP-FPM 到基于协程运行时过渡的精确类比。

以下是生产案例、独立基准测试和测量数据的汇总。

---

## 1. 生产案例：Duolingo — 迁移到异步 Python（吞吐量 +40%）

[Duolingo](https://blog.duolingo.com/async-python-migration/) 是最大的
语言学习平台（5 亿以上用户）。
后端使用 Python 编写。

2025 年，团队开始系统地将服务从同步 Python 迁移到异步。

| 指标                 | 结果                                    |
|----------------------|-----------------------------------------|
| 每实例吞吐量         | **+40%**                              |
| AWS EC2 成本节省     | 每个已迁移服务 **约 30%**               |

作者指出，在构建好异步基础设施后，迁移
各个服务变得"相当简单"。

**来源：** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. 生产案例：Super.com — 成本降低 90%

[Super.com](https://www.super.com/)（前身为 Snaptravel）是一个酒店搜索
和折扣服务。其搜索引擎处理 1,000+ req/s，
每天摄入 1 TB+ 的数据，每日处理 100 万美元以上的销售额。

**关键工作负载特征：** 每个请求向第三方 API 发起 **40 次以上网络调用**。
这是纯粹的 I/O 密集型场景 — 协程的理想候选者。

团队从 Flask（同步，AWS Lambda）迁移到 Quart（ASGI，EC2）。

| 指标                    | Flask (Lambda) | Quart (ASGI)  | 变化           |
|-------------------------|----------------|---------------|----------------|
| 基础设施成本            | ~$1,000/天     | ~$50/天       | **-90%**       |
| 吞吐量                  | ~150 req/s     | 300+ req/s    | **2 倍**       |
| 高峰时段错误            | 基准值         | -95%          | **-95%**       |
| 延迟                    | 基准值         | -50%          | **快 2 倍**    |

每天节省 $950 × 365 = **每年约 $350,000**，仅一项服务。

**来源：** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. 生产案例：Instagram — 5 亿 DAU 规模下的 asyncio

Instagram 在 Django 后端上服务 5 亿以上日活用户。

Jimmy Lai（Instagram 工程师）在 PyCon Taiwan 2018 的演讲中
描述了迁移到 asyncio 的过程：

- 将 `requests` 替换为 `aiohttp` 用于 HTTP 调用
- 将内部 RPC 迁移到 `asyncio`
- 实现了 API 性能改善和 CPU 空闲时间减少

**挑战：** 在 Instagram 的规模下 asyncio 的 CPU 开销较高，
需要通过静态代码分析自动检测阻塞调用。

**来源：** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. 生产案例：Feature Store — 从线程迁移到 asyncio（延迟 -40%）

Feature Store 服务从 Python 多线程迁移到 asyncio。

| 指标           | 线程                    | Asyncio              | 变化                    |
|----------------|-------------------------|----------------------|-------------------------|
| 延迟           | 基准值                  | -40%                 | **-40%**                |
| RAM 消耗       | 18 GB（数百个线程）     | 显著减少             | 大幅降低                |

迁移分三个阶段进行，使用 50/50 的生产流量
分流进行验证。

**来源：** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. 生产案例：Talk Python — Flask 到 Quart（延迟 -81%）

[Talk Python](https://talkpython.fm/) 是最大的 Python 播客
和学习平台之一。作者（Michael Kennedy）将网站
从 Flask（同步）重写为 Quart（异步 Flask）。

| 指标                 | Flask | Quart | 变化        |
|----------------------|-------|-------|-------------|
| 响应时间（示例）     | 42 ms | 8 ms  | **-81%**    |
| 迁移后 Bug           | —     | 2     | 极少        |

作者指出：在负载测试中，最大 req/s
差异不大，因为 MongoDB 查询花费不到 1 ms。
收益出现在**并发**请求处理时 —
当多个客户端同时访问服务器时。

**来源：** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop 作为标准

Microsoft 将 [uvloop](https://github.com/MagicStack/uvloop) —
一个基于 libuv 的快速事件循环 — 作为 Python 3.13+ 的
Azure Functions 的默认配置。

| 测试                          | 标准 asyncio   | uvloop      | 提升        |
|-------------------------------|----------------|-------------|-------------|
| 10K 请求，50 VU（本地）      | 515 req/s      | 565 req/s   | **+10%**    |
| 5 分钟，100 VU（Azure）      | 1,898 req/s    | 1,961 req/s | **+3%**     |
| 500 VU（本地）               | 720 req/s      | 772 req/s   | **+7%**     |

标准事件循环在 500 VU 时出现**约 2% 的请求丢失**。
uvloop — 零错误。

**来源：** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. 基准测试：IO 密集型任务 — asyncio 快 130 倍

下载 10,000 个 URL 任务的并发模型直接比较：

| 模型          | 时间     | 吞吐量         | 错误      |
|---------------|----------|----------------|-----------|
| 同步          | ~1,800 s | ~11 KB/s       | —         |
| 线程 (100)    | ~85 s    | ~238 KB/s      | 低        |
| **Asyncio**   | **14 s** | **1,435 KB/s** | **0.06%** |

Asyncio：比同步代码**快 130 倍**，比线程**快 6 倍**。

对于 CPU 密集型任务，asyncio 没有优势
（时间相同，内存消耗 +44%）。

**来源：** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. 基准测试：uvloop — 比 Go 和 Node.js 更快

[uvloop](https://github.com/MagicStack/uvloop) 是标准
asyncio 事件循环的直接替代品，使用 Cython 编写，基于 libuv（与 Node.js 使用的相同库）。

TCP echo 服务器：

| 实现                | 1 KiB (req/s) | 100 KiB 吞吐量 |
|---------------------|---------------|----------------|
| **uvloop**          | **105,459**   | **2.3 GiB/s**  |
| Go                  | 103,264       | —              |
| 标准 asyncio        | 41,420        | —              |
| Node.js             | 44,055        | —              |

HTTP 服务器（300 并发）：

| 实现                    | 1 KiB (req/s) |
|-------------------------|---------------|
| **uvloop + httptools**  | **37,866**    |
| Node.js                 | 更低          |

uvloop：比标准 asyncio **快 2.5 倍**，比 Node.js **快 2 倍**，
**与 Go 持平**。

**来源：** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. 基准测试：aiohttp vs requests — 并发请求快 10 倍

| 库            | req/s（并发）          | 类型  |
|---------------|------------------------|-------|
| **aiohttp**   | **241+**               | 异步  |
| HTTPX (async) | ~160                   | 异步  |
| Requests      | ~24                    | 同步  |

aiohttp：在并发 HTTP 请求中比 Requests **快 10 倍**。

**来源：** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. 反面论据：Cal Paterson — "异步 Python 并不更快"

呈现反面论据同样重要。Cal Paterson 使用**真实数据库**
（PostgreSQL，随机行选择 + JSON）进行了彻底的基准测试：

| 框架                          | 类型  | req/s     | P99 延迟    |
|-------------------------------|-------|-----------|-------------|
| Gunicorn + Meinheld/Bottle    | 同步  | **5,780** | **32 ms**   |
| Gunicorn + Meinheld/Falcon    | 同步  | **5,589** | **31 ms**   |
| Uvicorn + Starlette           | 异步  | 4,952     | 75 ms       |
| Sanic                         | 异步  | 4,687     | 85 ms       |
| AIOHTTP                       | 异步  | 4,501     | 76 ms       |

**结果：** 使用 C 服务器的同步框架表现出**更高的吞吐量**
和 **2-3 倍更好的尾部延迟**（P99）。

### 为什么异步输了？

原因：

1. 每个 HTTP 请求只有**一条 SQL 查询** — I/O 太少，
   协程并发无法发挥作用。
2. 在请求之间进行 CPU 工作的**协作式多任务**
   造成了"不公平"的 CPU 时间分配 —
   长计算会为所有人阻塞事件循环。
3. **asyncio 开销**（Python 中的标准事件循环）
   在 I/O 很少时与非阻塞 I/O 的收益相当。

### 异步实际在何时有帮助

Paterson 的基准测试测试的是**最简单的场景**（1 条 SQL 查询）。
正如上面的生产案例所展示的，异步在以下情况下提供巨大收益：

- 有**很多** 数据库/外部 API 查询（Super.com：每请求 40+ 次调用）
- **高**并发（数千个同时连接）
- I/O **远超** CPU（Duolingo、Appwrite）

这与理论一致：
阻塞系数（T_io/T_cpu）越高，协程的收益越大。
当只有 1 条 SQL 查询 × 2 ms 时，系数太低。

**来源：** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower：Python 框架

[TechEmpower Round 22](https://www.techempower.com/benchmarks/) 的近似结果：

| 框架              | 类型       | req/s (JSON)          |
|-------------------|------------|-----------------------|
| Uvicorn (raw)     | Async ASGI | Python 中最高         |
| Starlette         | Async ASGI | ~20,000–25,000        |
| FastAPI           | Async ASGI | ~15,000–22,000        |
| Flask (Gunicorn)  | Sync WSGI  | ~4,000–6,000          |
| Django (Gunicorn) | Sync WSGI  | ~2,000–4,000          |

异步框架：在 JSON 测试中比同步框架**快 3-5 倍**。

**来源：** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## 总结：Python 数据展示了什么

| 案例                        | 同步 → 异步                             | 条件                                   |
|-----------------------------|----------------------------------------|----------------------------------------|
| Duolingo（生产）            | 吞吐量 **+40%**，成本 **-30%**          | 微服务，I/O                            |
| Super.com（生产）           | 吞吐量 **2 倍**，成本 **-90%**          | 每请求 40+ API 调用                    |
| Feature Store（生产）       | 延迟 **-40%**                           | 从线程迁移到 asyncio                   |
| Talk Python（生产）         | 延迟 **-81%**                           | Flask → Quart                          |
| IO 密集型（10K URLs）       | **快 130 倍**                           | 纯 I/O，大规模并发                     |
| aiohttp vs requests         | **快 10 倍**                            | 并发 HTTP 请求                         |
| uvloop vs 标准              | **快 2.5 倍**                           | TCP echo，HTTP                         |
| TechEmpower JSON            | **3-5 倍**                              | FastAPI/Starlette vs Flask/Django      |
| **简单 CRUD（1 条 SQL）**   | **同步更快**                            | Cal Paterson：异步 P99 差 2-3 倍       |
| **CPU 密集型**              | **无差异**                              | 内存 +44%，收益 0%                     |

### 关键结论

异步 Python 在**高阻塞系数**下提供最大收益：
当 I/O 时间远超 CPU 时间时。
有 40+ 网络调用时（Super.com）— 节省 90% 成本。
只有 1 条 SQL 查询时（Cal Paterson）— 异步更慢。

这**验证了** [IO 密集型任务效率](/zh/docs/evidence/concurrency-efficiency.html)中的公式：
收益 ≈ 1 + T_io/T_cpu。当 T_io >> T_cpu 时 — 数十到数百倍。
当 T_io ≈ T_cpu 时 — 极小或为零。

---

## 与 PHP 和 True Async 的关联

Python 和 PHP 处于相似的境况：

| 特征                  | Python               | PHP                 |
|-----------------------|----------------------|---------------------|
| 解释型                | 是                   | 是                  |
| GIL / 单线程          | GIL                  | 单线程              |
| 主导模型              | 同步 (Django, Flask) | 同步 (FPM)          |
| 异步运行时            | asyncio + uvloop     | Swoole / True Async |
| 异步框架              | FastAPI, Starlette   | Hyperf              |

Python 的数据表明，在单线程解释型语言中
转向协程**是可行的**。收益的规模
取决于工作负载特性，而非语言本身。

---

## 参考文献

### 生产案例
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### 基准测试
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### 协程 vs 线程
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
