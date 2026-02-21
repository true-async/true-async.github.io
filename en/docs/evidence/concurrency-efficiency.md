---
layout: docs
lang: en
path_key: "/docs/evidence/concurrency-efficiency.html"
nav_active: docs
permalink: /en/docs/evidence/concurrency-efficiency.html
page_title: "IO-Bound vs CPU-bound"
description: "Concurrency efficiency analysis for IO-bound and CPU-bound tasks. Little's Law, Goetz's formula, calculating the optimal number of coroutines."
---

# IO-Bound vs CPU-bound

How much concurrency or parallelism provides a performance gain depends on the nature of the workload.
In server applications, two main types of tasks are typically distinguished.

- **IO-bound** — tasks where a significant portion of time is spent waiting for input/output operations:
  network requests, database queries, reading and writing files. During these moments, the CPU sits idle.
- **CPU-bound** — tasks requiring intensive computation that keep the processor busy almost constantly:
  complex algorithms, data processing, cryptography.

In recent years, most web applications have been shifting toward **IO-bound** workloads.
This is driven by the growth of microservices, remote `API`s, and cloud services.
Approaches like Frontend for Backend (`BFF`) and `API Gateway`, which aggregate data from multiple sources,
amplify this effect.

A modern server application is also hard to imagine without logging, telemetry,
and real-time monitoring. All these operations are inherently IO-bound.

## Efficiency of IO-bound Tasks

The efficiency of concurrent execution of `IO-bound` tasks is determined by
what fraction of time the task actually uses the `CPU`
versus how much it spends waiting for I/O operations to complete.

### Little's Law

In queueing theory, one of the fundamental formulas
is Little's Law ([Little's Law](https://en.wikipedia.org/wiki/Little%27s_law)):

$$
L = \lambda \cdot W
$$

Where:
- `L` — the average number of tasks in the system
- `λ` — the average rate of incoming requests
- `W` — the average time a task spends in the system

This law is universal and does not depend on the specific system implementation:
it doesn't matter whether threads, coroutines, or asynchronous callbacks are used.
It describes the fundamental relationship between load, latency,
and the level of concurrency.

When estimating concurrency for a server application, you are essentially
solving the problem of
how many tasks must be in the system simultaneously
for resources to be used efficiently.

For `IO-bound` workloads, the average request processing time is large
compared to the time spent on active computation.
Therefore, to keep the CPU from idling, there must be
a sufficient number of concurrent tasks in the system.

This is exactly the quantity that formal analysis allows us to estimate,
by relating:
- wait time,
- throughput,
- and the required level of concurrency.

A similar approach is used in industry for calculating
the optimal thread pool size (see Brian Goetz, *"Java Concurrency in Practice"*).

> The actual statistical data for each element of these formulas
> (number of SQL queries per HTTP request, DB latencies, PHP framework throughput)
> is collected in a separate document:
> [Statistical Data for Concurrency Calculation](/en/docs/evidence/real-world-statistics.html).

### Basic CPU Utilization

To calculate what fraction of time the processor
is actually doing useful work when executing a single task, the following formula can be used:

$$
U = \frac{T_{cpu}}{T_{cpu} + T_{io}}
$$

- `T_cpu` — the time spent performing computations on the CPU
- `T_io` — the time spent waiting for I/O operations

The sum `T_cpu + T_io` represents the total lifetime of a task
from start to completion.

The value `U` ranges from 0 to 1 and indicates the degree
of processor utilization:
- `U → 1` characterizes a computationally heavy (`CPU-bound`) task
- `U → 0` characterizes a task that spends most of its time waiting for I/O (`IO-bound`)

Thus, the formula provides a quantitative assessment of
how efficiently the `CPU` is being used
and whether the workload in question is `IO-bound` or `CPU-bound`.

### Impact of Concurrency

When executing multiple `IO-bound` tasks concurrently, the `CPU` can use
the `I/O` wait time of one task to perform computations for **another**.

CPU utilization with `N` concurrent tasks can be estimated as:

$$
U_N = \min\left(1,\; N \cdot \frac{T_{cpu}}{T_{cpu} + T_{io}}\right)
$$

Increasing concurrency improves `CPU` utilization,
but only up to a certain limit.

### Efficiency Limit

The maximum gain from concurrency is bounded by the ratio
of `I/O` wait time to computation time:

$$
E(N) \approx \min\left(N,\; 1 + \frac{T_{io}}{T_{cpu}}\right)
$$

In practice, this means that the number of truly useful
concurrent tasks is approximately equal to the ratio `T_io / T_cpu`.

### Optimal Concurrency

$$
N_{opt} \approx 1 + \frac{T_{io}}{T_{cpu}}
$$

The one in the formula accounts for the task currently executing on the `CPU`.
With a large `T_io / T_cpu` ratio (which is typical for `IO-bound` workloads),
the contribution of one is negligible, and the formula is often simplified to `T_io / T_cpu`.

This formula is a special case (for a single core) of the classic
optimal thread pool size formula proposed by Brian Goetz
in the book *"Java Concurrency in Practice"* (2006):

$$
N_{threads} = N_{cores} \times \left(1 + \frac{T_{wait}}{T_{service}}\right)
$$

The ratio `T_wait / T_service` is known as the **blocking coefficient**.
The higher this coefficient, the more concurrent
tasks can be effectively utilized by a single core.

At this level of concurrency, the processor spends most of its time
doing useful work, and further increasing the number of tasks
no longer yields a noticeable gain.

This is precisely why asynchronous execution models
are most effective for `IO-bound` web workloads.

## Example Calculation for a Typical Web Application

Let's consider a simplified but fairly realistic model of an average server-side web application.
Assume that processing a single `HTTP` request primarily involves interacting with a database
and does not contain computationally complex operations.

### Initial Assumptions

- Approximately **20 SQL queries** are executed per HTTP request
- Computation is limited to data mapping, response serialization, and logging
- The database is outside the application process (remote I/O)

> **Why 20 queries?**
> This is the median estimate for ORM applications of moderate complexity.
> For comparison:
> * WordPress generates ~17 queries per page,
> * Drupal without caching — from 80 to 100,
> * and a typical Laravel/Symfony application — from 10 to 30.
>
> The main source of growth is the N+1 pattern, where the ORM loads related entities
> with separate queries.

### Execution Time Estimate

For the estimate, we'll use averaged values:

- One SQL query:
    - I/O wait time: `T_io ≈ 4 ms`
    - CPU computation time: `T_cpu ≈ 0.05 ms`

Total per HTTP request:

- `T_io = 20 × 4 ms = 80 ms`
- `T_cpu = 20 × 0.05 ms = 1 ms`

> **About the chosen latency values.**
> The I/O time for a single `SQL` query consists of the network latency (`round-trip`)
> and the query execution time on the DB server.
> Network round-trip within a single data center is ~0.5 ms,
> and for cloud environments (cross-AZ, managed RDS) — 1–5 ms.
> Accounting for the execution time of a moderately complex query,
> the resulting 4 ms per query is a realistic estimate for a cloud environment.
> The CPU time (0.05 ms) covers ORM result mapping, entity hydration,
> and basic processing logic.

### Workload Characteristics

The ratio of wait time to computation time:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{1} = 80
$$

This means the task is predominantly **IO-bound**:
the processor spends most of its time idle,
waiting for I/O operations to complete.

### Estimating the Number of Coroutines

The optimal number of concurrent coroutines per CPU core
is approximately equal to the ratio of I/O wait time to computation time:

$$
N_{coroutines} \approx \frac{T_{io}}{T_{cpu}} \approx 80
$$

In other words, approximately **80 coroutines per core** allow virtually complete
hiding of I/O latency while maintaining high CPU utilization.

For comparison: [Zalando Engineering](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)
provides an example with a microservice where response time is 50 ms and processing time is 5 ms
on a dual-core machine: `2 × (1 + 50/5) = 22 threads` — the same principle, the same formula.

### Scaling by Number of Cores

For a server with `C` cores:

$$
N_{total} \approx C \cdot \frac{T_{io}}{T_{cpu}}
$$

For example, for an 8-core processor:

$$
N_{total} \approx 8 \times 80 = 640 \text{ coroutines}
$$

This value reflects the **useful level of concurrency**,
not a hard limit.

### Sensitivity to Environment

The value of 80 coroutines per core is not a universal constant,
but the result of specific assumptions about I/O latency.
Depending on the network environment, the optimal number of concurrent tasks
may differ significantly:

| Environment                     | T_io per SQL query | T_io total (×20) | N per core |
|---------------------------------|--------------------|-------------------|------------|
| Localhost / Unix-socket         | ~0.1 ms            | 2 ms              | ~2         |
| LAN (single data center)       | ~1 ms              | 20 ms             | ~20        |
| Cloud (cross-AZ, RDS)          | ~4 ms              | 80 ms             | ~80        |
| Remote server / cross-region   | ~10 ms             | 200 ms            | ~200       |

The greater the latency, the more coroutines are needed
to fully utilize the CPU with useful work.

### PHP-FPM vs Coroutines: Approximate Calculation

To estimate the practical benefit of coroutines,
let's compare two execution models on the same server
with the same workload.

#### Initial Data

**Server:** 8 cores, cloud environment (cross-AZ RDS).

**Workload:** typical Laravel API endpoint —
authorization, Eloquent queries with eager loading, JSON serialization.

Based on benchmark data from
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)
and [Kinsta](https://kinsta.com/blog/php-benchmarks/):

| Parameter                                       | Value      | Source            |
|-------------------------------------------------|------------|-------------------|
| Laravel API throughput (30 vCPU, localhost DB)   | ~440 req/s | Sevalla, PHP 8.3  |
| Number of PHP-FPM workers in benchmark           | 15         | Sevalla           |
| Response time (W) in benchmark                   | ~34 ms     | L/λ = 15/440      |
| Memory per PHP-FPM worker                        | ~40 MB     | Typical value     |

#### Step 1: Estimating T_cpu and T_io

In the **Sevalla** benchmark, the database runs on localhost (latency <0.1 ms).
With ~10 SQL queries per endpoint, total I/O is less than 1 ms.

Given:
- Throughput: λ ≈ 440 req/s
- Number of concurrently served requests (PHP-FPM workers): L = 15
- Database on localhost, so T_io ≈ 0

By Little's Law:

$$
W = \frac{L}{\lambda} = \frac{15}{440} \approx 0.034 \, \text{s} \approx 34 \, \text{ms}
$$

Since in this benchmark the database runs on `localhost`
and total `I/O` is less than 1 ms,
the resulting average response time almost entirely reflects
the `CPU` processing time per request:

$$
T_{cpu} \approx W \approx 34 \, \text{ms}
$$

This means that under `localhost` conditions, nearly all the response time (~34 ms) is `CPU`:
framework, `middleware`, `ORM`, serialization.


Let's move the same endpoint to a **cloud environment** with 20 `SQL` queries:

$$
T_{cpu} = 34 \text{ ms (framework + logic)}
$$

$$
T_{io} = 20 \times 4 \text{ ms} = 80 \text{ ms (DB wait time)}
$$

$$
W = T_{cpu} + T_{io} = 114 \text{ ms}
$$

Blocking coefficient:

$$
\frac{T_{io}}{T_{cpu}} = \frac{80}{34} \approx 2.4
$$

#### Step 2: PHP-FPM

In the `PHP-FPM` model, each worker is a separate OS process.
During `I/O` wait, the worker blocks and cannot process other requests.

To fully utilize 8 cores, enough workers are needed
so that at any given moment, 8 of them are performing `CPU` work:

$$
N_{workers} = 8 \times \left(1 + \frac{80}{34}\right) = 8 \times 3.4 = 27
$$

| Metric                             | Value         |
|-------------------------------------|---------------|
| Workers                            | 27            |
| Memory (27 × 40 MB)                | **1.08 GB**   |
| Throughput (27 / 0.114)            | **237 req/s** |
| CPU utilization                    | ~100%         |

In practice, administrators often set `pm.max_children = 50–100`,
which is above the optimum. Extra workers compete for CPU,
increase the number of OS context switches,
and consume memory without increasing throughput.

#### Step 3: Coroutines (event loop)

In the coroutine model, a single thread (per core) serves
many requests. When a coroutine awaits I/O,
the scheduler switches to another in ~200 nanoseconds
(see [evidence base](/en/docs/evidence/coroutines-evidence.html)).

The optimal number of coroutines is the same:

$$
N_{coroutines} = 8 \times 3.4 = 27
$$

| Metric                 | Value         |
|------------------------|---------------|
| Coroutines             | 27            |
| Memory (27 × ~2 MiB)  | **54 MiB**    |
| Throughput             | **237 req/s** |
| CPU utilization        | ~100%         |

Throughput is **the same** — because the CPU is the bottleneck.
But memory for concurrency: **54 MiB vs 1.08 GB** — a **~20x** difference.

> **About coroutine stack size.**
> The memory footprint of a coroutine in PHP is determined by the reserved C-stack size.
> By default this is ~2 MiB, but it can be reduced to 128 KiB.
> With a 128 KiB stack, memory for 27 coroutines would be just ~3.4 MiB.

#### Step 4: What if CPU load is lower?

The `Laravel` framework in `FPM` mode spends ~34 ms of `CPU` per request,
which includes re-initialization of services on every request.

In a stateful runtime (which `True Async` is), these costs are significantly reduced:
routes are compiled, the dependency container is initialized,
connection pools are reused.

If `T_cpu` drops from 34 ms to 5 ms (which is realistic for stateful mode),
the picture changes dramatically:

| T_cpu | Blocking coeff. | N (8 cores) | λ (req/s) | Memory (FPM) | Memory (coroutines) |
|-------|-----------------|------------|-----------|--------------|---------------------|
| 34 ms | 2.4             | 27         | 237       | 1.08 GB      | 54 MiB              |
| 10 ms | 8               | 72         | 800       | 2.88 GB      | 144 MiB             |
| 5 ms  | 16              | 136        | 1 600     | 5.44 GB      | 272 MiB             |
| 1 ms  | 80              | 648        | 8 000     | **25.9 GB**  | **1.27 GiB**        |

At `T_cpu = 1 ms` (lightweight handler, minimal overhead):
- PHP-FPM would require **648 processes and 25.9 GB RAM** — unrealistic
- Coroutines require the same 648 tasks and **1.27 GiB** — **~20x less**

#### Step 5: Little's Law — verification through throughput

Let's verify the result for `T_cpu = 5 ms`:

$$
\lambda = \frac{L}{W} = \frac{136}{0.085} = 1\,600 \text{ req/s}
$$

To achieve the same throughput, PHP-FPM needs 136 workers.
Each occupies ~40 MB:

$$
136 \times 40 \text{ MB} = 5.44 \text{ GB for workers alone}
$$

Coroutines:

$$
136 \times 2 \text{ MiB} = 272 \text{ MiB}
$$

The freed ~5.2 GB can be directed toward caches,
DB connection pools, or handling more requests.

#### Summary: When Coroutines Provide a Benefit

| Condition                                       | Benefit from coroutines                                                  |
|-------------------------------------------------|--------------------------------------------------------------------------|
| Heavy framework, localhost DB (T_io ≈ 0)        | Minimal — the workload is CPU-bound                                      |
| Heavy framework, cloud DB (T_io = 80 ms)        | Moderate — ~20x memory savings at the same throughput                    |
| Lightweight handler, cloud DB                   | **Maximum** — throughput increase up to 13x, ~20x memory savings         |
| Microservice / API Gateway                      | **Maximum** — nearly pure I/O, tens of thousands of req/s on one server  |

**Conclusion:** the greater the share of I/O in total request time and the lighter the CPU processing,
the greater the benefit from coroutines.
For IO-bound applications (which is the majority of modern web services),
coroutines allow utilizing the same CPU several times more efficiently,
while consuming orders of magnitude less memory.

### Practical Notes

- Increasing the number of coroutines above the optimal level rarely provides a benefit,
  but it is not a problem either: coroutines are lightweight, and the overhead from "extra"
  coroutines is incomparably small compared to the cost of OS threads
- The real limitations become:
    - database connection pool
    - network latency
    - back-pressure mechanisms
    - open file descriptor limits (ulimit)
- For such workloads, the *event loop + coroutines* model proves to be
  significantly more efficient than the classic blocking model

### Conclusion

For a typical modern web application
where I/O operations predominate,
the asynchronous execution model allows you to:
- effectively hide I/O latency
- significantly improve CPU utilization
- reduce the need for a large number of threads

It is precisely in such scenarios that the advantages of asynchrony
are most clearly demonstrated.

---

### Further Reading

- [Swoole in Practice: Real-World Measurements](/en/docs/evidence/swoole-evidence.html) — production cases (Appwrite +91%, IdleMMO 35M req/day), independent benchmarks with and without DB, TechEmpower
- [Python asyncio in Practice](/en/docs/evidence/python-evidence.html) — Duolingo +40%, Super.com −90% costs, uvloop benchmarks, counter-arguments
- [Evidence Base: Why Single-Threaded Coroutines Work](/en/docs/evidence/coroutines-evidence.html) — context switch cost measurements, comparison with OS threads, academic research and industry benchmarks

---

### References and Literature

- Brian Goetz, *Java Concurrency in Practice* (2006) — optimal thread pool size formula: `N = cores × (1 + W/S)`
- [Zalando Engineering: How to set an ideal thread pool size](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html) — practical application of Goetz's formula with examples and derivation through Little's Law
- [Backendhance: The Optimal Thread-Pool Size in Java](https://backendhance.com/en/blog/2023/optimal-thread-pool-size/) — detailed analysis of the formula accounting for target CPU utilization
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — measurements of network latency impact on PostgreSQL performance
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — guidelines for acceptable SQL query latencies in web applications
