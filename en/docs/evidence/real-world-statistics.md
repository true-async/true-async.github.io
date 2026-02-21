---
layout: docs
lang: en
path_key: "/docs/evidence/real-world-statistics.html"
nav_active: docs
permalink: /en/docs/evidence/real-world-statistics.html
page_title: "Concurrency Statistics"
description: "Real-world statistical data for concurrency calculation: SQL queries, DB latencies, PHP framework throughput."
---

# Statistical Data for Concurrency Calculation

The formulas from the [IO-bound Task Efficiency](/en/docs/evidence/concurrency-efficiency.html) section operate on
several key quantities. Below is a collection of real-world measurements
that allow you to plug concrete numbers into the formulas.

---

## Formula Elements

Little's Law:

$$
L = \lambda \cdot W
$$

- `L` — the required level of concurrency (how many tasks simultaneously)
- `λ` — throughput (requests per second)
- `W` — average time to process one request

Goetz's formula:

$$
N = N_{cores} \times \left(1 + \frac{T_{io}}{T_{cpu}}\right)
$$

- `T_io` — I/O wait time per request
- `T_cpu` — CPU computation time per request

For practical calculation, you need to know:

1. **How many SQL queries are executed per HTTP request**
2. **How long one SQL query takes (I/O)**
3. **How long CPU processing takes**
4. **What the server throughput is**
5. **What the overall response time is**

---

## 1. SQL Queries per HTTP Request

The number of database calls depends on the framework, ORM, and page complexity.

| Application / Framework            | Queries per page       | Source                                                                                                           |
|-------------------------------------|------------------------|------------------------------------------------------------------------------------------------------------------|
| WordPress (no plugins)              | ~17                    | [Drupal Groups: How many queries per page](https://groups.drupal.org/node/12431)                                 |
| Symfony (Doctrine, average page)    | <30 (profiler threshold) | [Symfony Docs: Profiler testing](https://symfony.com/doc/current/testing/profiling.html)                       |
| Laravel (simple CRUD)               | 5–15                   | Typical values from Laravel Debugbar                                                                             |
| Laravel (with N+1 problem)          | 20–50+                 | [Laravel Daily: Debug Slow Queries](https://laraveldaily.com/post/laravel-eloquent-tools-debug-slow-sql-queries) |
| Drupal (no cache)                   | 80–100                 | [Drupal Groups](https://groups.drupal.org/node/12431)                                                            |
| Magento (catalog)                   | 50–200+                | Typical for complex e-commerce                                                                                   |

**Median for a typical ORM application: 15–30 queries per HTTP request.**

Symfony uses a threshold of 30 queries as the "normal" boundary — when exceeded,
the profiler icon turns yellow.

## 2. Time per SQL Query (T_io per query)

### Query Execution Time on the DB Server

Data from Percona's sysbench OLTP benchmarks (MySQL):

| Concurrency   | Share of queries <0.1 ms | 0.1–1 ms | 1–10 ms | >10 ms |
|---------------|--------------------------|----------|---------|--------|
| 1 thread      | 86%                      | 10%      | 3%      | 1%     |
| 32 threads    | 68%                      | 30%      | 2%      | <1%    |
| 128 threads   | 52%                      | 35%      | 12%     | 1%     |

LinkBench (Percona, approximating real Facebook workload):

| Operation     | p50    | p95   | p99    |
|---------------|--------|-------|--------|
| GET_NODE      | 0.4 ms | 39 ms | 77 ms  |
| UPDATE_NODE   | 0.7 ms | 47 ms | 100 ms |

**Source:** [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/),
[Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/)

### Network Latency (round-trip)

| Scenario                | Round-trip | Source |
|-------------------------|------------|--------|
| Unix-socket / localhost | <0.1 ms    | [CYBERTEC PostgreSQL](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) |
| LAN, single data center | ~0.5 ms   | CYBERTEC PostgreSQL |
| Cloud, cross-AZ         | 1–5 ms    | CYBERTEC PostgreSQL |
| Cross-region             | 10–50 ms  | Typical values |

### Total: Full Time per SQL Query

Full time = server-side execution time + network round-trip.

| Environment       | Simple SELECT (p50) | Average query (p50) |
|-------------------|---------------------|---------------------|
| Localhost         | 0.1–0.5 ms         | 0.5–2 ms            |
| LAN (single DC)  | 0.5–1.5 ms         | 1–4 ms              |
| Cloud (cross-AZ) | 2–6 ms             | 3–10 ms             |

For a cloud environment, **4 ms per average query** is a well-grounded estimate.

## 3. CPU Time per SQL Query (T_cpu per query)

CPU time covers: result parsing, ORM entity hydration,
object mapping, serialization.

Direct benchmarks of this specific value are scarce in public sources,
but can be estimated from profiler data:

- Blackfire.io separates wall time into **I/O time** and **CPU time**
  ([Blackfire: Time](https://blackfire.io/docs/reference-guide/time))
- In typical PHP applications, the database is the main bottleneck,
  and CPU time constitutes a small fraction of wall time
  ([Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/))

**Indirect estimate via throughput:**

Symfony with Doctrine (DB + Twig rendering) processes ~1000 req/s
([Kinsta PHP Benchmarks](https://kinsta.com/blog/php-benchmarks/)).
This means CPU time per request ≈ 1 ms.
With ~20 SQL queries per page → **~0.05 ms CPU per SQL query**.

Laravel API endpoint (Sanctum + Eloquent + JSON) → ~440 req/s
([Sevalla: Laravel Benchmarks](https://sevalla.com/blog/laravel-benchmarks/)).
CPU time per request ≈ 2.3 ms. With ~15 queries → **~0.15 ms CPU per SQL query**.

## 4. Throughput (λ) of PHP Applications

Benchmarks run on 30 vCPU / 120 GB RAM, nginx + PHP-FPM,
15 concurrent connections ([Kinsta](https://kinsta.com/blog/php-benchmarks/),
[Sevalla](https://sevalla.com/blog/laravel-benchmarks/)):

| Application | Page type              | req/s (PHP 8.4) |
|-------------|------------------------|-----------------|
| Laravel     | Welcome (no DB)        | ~700            |
| Laravel     | API + Eloquent + Auth  | ~440            |
| Symfony     | Doctrine + Twig        | ~1,000          |
| WordPress   | Homepage (no plugins)  | ~148            |
| Drupal 10   | —                      | ~1,400          |

Note that WordPress is significantly slower
because each request is heavier (more SQL queries, more complex rendering).

---

## 5. Overall Response Time (W) in Production

Data from LittleData (2023, 2,800 e-commerce sites):

| Platform                | Average server response time |
|-------------------------|------------------------------|
| Shopify                 | 380 ms                       |
| E-commerce average      | 450 ms                       |
| WooCommerce (WordPress) | 780 ms                       |
| Magento                 | 820 ms                       |

**Source:** [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time)

Industry benchmarks:

| Category              | API response time |
|-----------------------|-------------------|
| Excellent             | 100–300 ms        |
| Acceptable            | 300–600 ms        |
| Needs optimization    | >600 ms           |

## Practical Calculation Using Little's Law

### Scenario 1: Laravel API in the Cloud

**Input data:**
- λ = 440 req/s (target throughput)
- W = 80 ms (calculated: 20 SQL × 4 ms I/O + 1 ms CPU)
- Cores: 8

**Calculation:**

$$
L = \lambda \cdot W = 440 \times 0.080 = 35 \text{ concurrent tasks}
$$

On 8 cores, that's ~4.4 tasks per core. This matches the fact that Laravel with 15 concurrent
PHP-FPM workers already achieves 440 req/s. There is headroom.

### Scenario 2: Laravel API in the Cloud, 2000 req/s (target)

**Input data:**
- λ = 2000 req/s (target throughput)
- W = 80 ms
- Cores: 8

**Calculation:**

$$
L = 2000 \times 0.080 = 160 \text{ concurrent tasks}
$$

PHP-FPM cannot handle 160 workers on 8 cores — each worker is a separate process
with ~30–50 MB of memory. Total: ~6–8 GB for workers alone.

With coroutines: 160 tasks × ~4 KiB ≈ **640 KiB**. A difference of **four orders of magnitude**.

### Scenario 3: Using Goetz's Formula

**Input data:**
- T_io = 80 ms (20 queries × 4 ms)
- T_cpu = 1 ms
- Cores: 8

**Calculation:**

$$
N = 8 \times \left(1 + \frac{80}{1}\right) = 8 \times 81 = 648 \text{ coroutines}
$$

**Throughput** (via Little's Law):

$$
\lambda = \frac{L}{W} = \frac{648}{0.081} \approx 8\,000 \text{ req/s}
$$

This is the theoretical ceiling with full utilization of 8 cores.
In practice, it will be lower due to scheduler overhead, GC, connection pool limits.
But even 50% of this value (4,000 req/s) is
**an order of magnitude greater** than 440 req/s from PHP-FPM on the same 8 cores.

## Summary: Where the Numbers Come From

| Quantity                           | Value            | Source                                    |
|------------------------------------|------------------|-------------------------------------------|
| SQL queries per HTTP request       | 15–30            | WordPress ~17, Symfony threshold <30      |
| Time per SQL query (cloud)         | 3–6 ms           | Percona p50 + CYBERTEC round-trip         |
| CPU per SQL query                  | 0.05–0.15 ms     | Reverse calculation from throughput benchmarks |
| Laravel throughput                 | ~440 req/s (API) | Sevalla/Kinsta benchmarks, PHP 8.4        |
| E-commerce response time (average) | 450 ms           | LittleData, 2,800 sites                  |
| API response time (norm)           | 100–300 ms       | Industry benchmark                        |

---

## References

### PHP Framework Benchmarks
- [Kinsta: PHP 8.5 Benchmarks](https://kinsta.com/blog/php-benchmarks/) — throughput for WordPress, Laravel, Symfony, Drupal
- [Sevalla: Laravel Performance Benchmarks](https://sevalla.com/blog/laravel-benchmarks/) — Laravel welcome + API endpoint

### Database Benchmarks
- [Percona: MySQL and Percona Server in LinkBench](https://percona.com/blog/2013/05/08/mysql-and-percona-server-in-linkbench-benchmark/) — p50/p95/p99 per operation
- [Percona: Query Response Time Histogram](https://www.percona.com/blog/query-response-time-histogram-new-feature-in-percona-server/) — latency distribution at varying concurrency
- [CYBERTEC: PostgreSQL Network Latency](https://www.cybertec-postgresql.com/en/postgresql-network-latency-does-make-a-big-difference/) — network latencies by environment
- [PostgresAI: What is a slow SQL query?](https://postgres.ai/blog/20210909-what-is-a-slow-sql-query) — thresholds <10ms / >100ms

### Production System Response Times
- [LittleData: Average Server Response Time](https://www.littledata.io/average/server-response-time) — 2,800 e-commerce sites

### PHP Profiling
- [Blackfire.io: Time](https://blackfire.io/docs/reference-guide/time) — wall time breakdown into I/O and CPU
- [Datadog: Monitor PHP Performance](https://www.datadoghq.com/blog/monitor-php-performance/) — APM for PHP applications
