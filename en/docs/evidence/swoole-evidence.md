---
layout: docs
lang: en
path_key: "/docs/evidence/swoole-evidence.html"
nav_active: docs
permalink: /en/docs/evidence/swoole-evidence.html
page_title: "Swoole in Practice"
description: "Swoole in practice: production cases from Appwrite and IdleMMO, independent benchmarks, TechEmpower, comparison with PHP-FPM."
---

# Swoole in Practice: Real-World Measurements

Swoole is a PHP extension written in C that provides an event loop, coroutines,
and asynchronous I/O. It is the only mature implementation of the coroutine model
in the PHP ecosystem with years of production experience.

Below is a collection of real-world measurements: production cases, independent benchmarks,
and TechEmpower data.

### Two Sources of Performance Gain

Transitioning from PHP-FPM to Swoole provides **two independent** advantages:

1. **Stateful runtime** — the application loads once and stays in memory.
   The overhead of re-initialization (autoload, DI container, configuration)
   on every request disappears. This effect provides a gain even without I/O.

2. **Coroutine concurrency** — while one coroutine waits for a DB or external API response,
   others process requests on the same core. This effect manifests
   **only when I/O is present** and requires the use of asynchronous clients
   (coroutine-based MySQL, Redis, HTTP client).

Most public benchmarks **do not separate** these two effects.
Tests without a DB (Hello World, JSON) measure only the stateful effect.
Tests with a DB measure the **sum of both**, but do not allow isolating the coroutine contribution.

Each section below indicates which effect predominates.

## 1. Production: Appwrite — Migration from FPM to Swoole (+91%)

> **What is measured:** stateful runtime **+** coroutine concurrency.
> Appwrite is an I/O proxy with minimal CPU work. The gain comes from
> both factors, but isolating the coroutine contribution from public data is not possible.

[Appwrite](https://appwrite.io/) is an open-source Backend-as-a-Service (BaaS)
written in PHP. Appwrite provides a ready-made server API
for common mobile and web application tasks:
user authentication, database management,
file storage, cloud functions, push notifications.

By its nature, Appwrite is a **pure I/O proxy**:
almost every incoming HTTP request translates into one or more
I/O operations (MariaDB query, Redis call,
file read/write), with minimal CPU computation of its own.
This workload profile extracts maximum benefit
from transitioning to coroutines: while one coroutine waits for a DB response,
others process new requests on the same core.

In version 0.7, the team replaced Nginx + PHP-FPM with Swoole.

**Test conditions:**
500 concurrent clients, 5 minutes of load (k6).
All requests to endpoints with authorization and abuse control.

| Metric                       | FPM (v0.6.2) | Swoole (v0.7) | Change          |
|------------------------------|--------------|---------------|-----------------|
| Requests per second          | 436          | 808           | **+85%**        |
| Total requests in 5 min      | 131,117      | 242,336       | **+85%**        |
| Response time (normal)       | 3.77 ms      | 1.61 ms       | **−57%**        |
| Response time (under load)   | 550 ms       | 297 ms        | **−46%**        |
| Request success rate         | 98%          | 100%          | No timeouts     |

Overall improvement reported by the team: **~91%** across combined metrics.

**Source:** [Appwrite 0.7: 91% boost in API Performance (DEV.to)](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)



## 2. Production: IdleMMO — 35 Million Requests per Day on a Single Server

> **What is measured:** predominantly **stateful runtime**.
> Laravel Octane runs Swoole in "one request — one worker" mode,
> without coroutine I/O multiplexing within a request.
> The performance gain is due to Laravel not reloading on every request.

[IdleMMO](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane) is
a PHP application (Laravel Octane + Swoole), an MMORPG with 160,000+ users.

| Metric                     | Value                             |
|----------------------------|-----------------------------------|
| Requests per day           | 35,000,000 (~405 req/s average)   |
| Potential (author estimate)| 50,000,000+ req/day               |
| Server                     | 1 × 32 vCPU                      |
| Swoole workers             | 64 (4 per core)                   |
| p95 latency before tuning  | 394 ms                            |
| p95 latency after Octane   | **172 ms (−56%)**                 |

The author notes that for less CPU-intensive applications (not an MMORPG),
the same server could handle **significantly more** requests.

**Source:** [From Zero to 35M: The Struggles of Scaling Laravel with Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

## 3. Benchmark: PHP-FPM vs Swoole (BytePursuits)

> **What is measured:** only **stateful runtime**.
> The test returns JSON without accessing a DB or external services.
> Coroutine concurrency is not involved here — there is no I/O that could
> be performed in parallel. The 2.6–3x difference is due entirely to
> Swoole not recreating the application on every request.

Independent benchmark on the Mezzio microframework (JSON response, no DB).
Intel i7-6700T (4 cores / 8 threads), 32 GB RAM, wrk, 10 seconds.

| Concurrency | PHP-FPM (req/s) | Swoole BASE (req/s) | Difference |
|-------------|-----------------|---------------------|------------|
| 100         | 3,472           | 9,090               | **2.6x**   |
| 500         | 3,218           | 9,159               | **2.8x**   |
| 1,000       | 3,065           | 9,205               | **3.0x**   |

Average latency at 1000 concurrent:
- FPM: **191 ms**
- Swoole: **106 ms**

**Critical point:** starting at 500 concurrent connections,
PHP-FPM began losing requests (73,793 socket errors at 500, 176,652 at 700).
Swoole had **zero errors** at all concurrency levels.

**Source:** [BytePursuits: Benchmarking PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)

## 4. Benchmark: With Database (kenashkov)

> **What is measured:** a set of tests with **different** effects.
> - Hello World, Autoload — pure **stateful runtime** (no I/O).
> - SQL query, real-world scenario — **stateful + coroutines**.
> - Swoole uses a coroutine-based MySQL client, which allows serving
> - other requests while waiting for a DB response.

A more realistic test suite: Swoole 4.4.10 vs Apache + mod_php.
ApacheBench, 100–1000 concurrent, 10,000 requests.

| Scenario                              | Apache (100 conc.) | Swoole (100 conc.) | Difference |
|---------------------------------------|--------------------|--------------------|------------|
| Hello World                           | 25,706 req/s       | 66,309 req/s       | **2.6x**   |
| Autoload 100 classes                  | 2,074 req/s        | 53,626 req/s       | **25x**    |
| SQL query to DB                       | 2,327 req/s        | 4,163 req/s        | **1.8x**   |
| Real-world scenario (cache + files + DB) | 141 req/s       | 286 req/s          | **2.0x**   |

At 1000 concurrent:
- Apache **crashed** (connection limit, failed requests)
- Swoole — **zero errors** in all tests

**Key observation:** with real I/O (DB + files), the difference
drops from 25x to **1.8–2x**. This is expected:
the database becomes the common bottleneck.
But stability under load remains incomparable.

**Source:** [kenashkov/swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)

## 5. Benchmark: Symfony 7 — All Runtimes (2024)

> **What is measured:** only **stateful runtime**.
> Test without DB — coroutines are not involved.
> The >10x difference at 1000 concurrent is explained by the fact that FPM creates
> a process per request, while Swoole and FrankenPHP keep the application
> in memory and serve connections through an event loop.

Test of 9 PHP runtimes with Symfony 7 (k6, Docker, 1 CPU / 1 GB RAM, no DB).

| Runtime                           | vs Nginx + PHP-FPM (at 1000 conc.) |
|-----------------------------------|-------------------------------------|
| Apache + mod_php                  | ~0.5x (slower)                     |
| Nginx + PHP-FPM                   | 1x (baseline)                      |
| Nginx Unit                        | ~3x                                |
| RoadRunner                        | >2x                                |
| **Swoole / FrankenPHP (worker)**  | **>10x**                           |

At 1000 concurrent connections, Swoole and FrankenPHP in worker mode
showed **an order of magnitude higher throughput**
than classic Nginx + PHP-FPM.

**Source:** [Performance benchmark of PHP runtimes (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

## 6. TechEmpower: Swoole — First Place Among PHP

> **What is measured:** **stateful + coroutines** (in DB tests).
> TechEmpower includes both a JSON test (stateful) and tests with multiple
> SQL queries (multiple queries, Fortunes), where coroutine-based DB access
> provides a real advantage. This is one of the few benchmarks
> where the coroutine effect is most clearly visible.

In [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
(Round 22, 2023), Swoole took **first place** among all PHP frameworks
in the MySQL test.

TechEmpower tests real-world scenarios: JSON serialization,
single DB queries, multiple queries, ORM, Fortunes
(templating + DB + sorting + escaping).

**Source:** [TechEmpower Round 22](https://www.techempower.com/blog/2023/11/15/framework-benchmarks-round-22/),
[swoole-src README](https://github.com/swoole/swoole-src)

## 7. Hyperf: 96,000 req/s on a Swoole Framework

> **What is measured:** **stateful runtime** (benchmark is Hello World).
> Hyperf is entirely built on Swoole coroutines, and in production,
> coroutine concurrency is utilized for DB, Redis, and gRPC calls.
> However, the 96K req/s figure was obtained on Hello World without I/O,
> meaning it reflects the stateful runtime effect.

[Hyperf](https://hyperf.dev/) is a coroutine-based PHP framework built on Swoole.
In the benchmark (4 threads, 100 connections):

- **96,563 req/s**
- Latency: 7.66 ms

Hyperf is positioned for microservices and claims
**5–10x** advantage over traditional PHP frameworks.

**Source:** [Hyperf GitHub](https://github.com/hyperf/hyperf)

## Summary: What Real Data Shows

| Test type                        | FPM → Swoole                    | Primary effect      | Note                                          |
|----------------------------------|---------------------------------|---------------------|-----------------------------------------------|
| Hello World / JSON               | **2.6–3x**                      | Stateful            | BytePursuits, kenashkov                       |
| Autoload (stateful vs stateless) | **25x**                         | Stateful            | No I/O — pure effect of state preservation    |
| With database                    | **1.8–2x**                      | Stateful + coroutines | kenashkov (coroutine MySQL)                 |
| Production API (Appwrite)        | **+91%** (1.85x)                | Stateful + coroutines | I/O proxy, both factors                     |
| Production (IdleMMO)             | p95: **−56%**                   | Stateful            | Octane workers, not coroutines                |
| High concurrency (1000+)         | **Swoole stable, FPM crashes**  | Event loop          | All benchmarks                                |
| Symfony runtimes (1000 conc.)    | **>10x**                        | Stateful            | No DB in test                                 |
| TechEmpower (DB tests)           | **#1 among PHP**                | Stateful + coroutines | Multiple SQL queries                        |

## Connection to Theory

The results align well with calculations from [IO-bound Task Efficiency](/en/docs/evidence/concurrency-efficiency.html):

**1. With a database, the difference is more modest (1.8–2x) than without one (3–10x).**
This confirms: with real I/O, the bottleneck becomes the DB itself,
not the concurrency model. The blocking coefficient in DB tests is lower
because the framework's CPU work is comparable to I/O time.

**2. At high concurrency (500–1000+), FPM degrades while Swoole does not.**
PHP-FPM is limited by the number of workers. Each worker is an OS process (~40 MB).
At 500+ concurrent connections, FPM reaches its limit
and starts losing requests. Swoole serves thousands of connections
in dozens of coroutines without increasing memory consumption.

**3. Stateful runtime eliminates re-initialization overhead.**
The 25x difference in the autoload test demonstrates the cost
of recreating application state on every request in FPM.
In production, this manifests as the difference between T_cpu = 34 ms (FPM)
and T_cpu = 5–10 ms (stateful), which dramatically changes the blocking coefficient
and consequently the gain from coroutines
(see [table in IO-bound Task Efficiency](/en/docs/evidence/concurrency-efficiency.html)).

**4. The formula is confirmed.**
Appwrite: FPM 436 req/s → Swoole 808 req/s (1.85x).
If T_cpu dropped from ~30 ms to ~15 ms (stateful)
and T_io remained ~30 ms, then the blocking coefficient increased from 1.0 to 2.0,
which predicts a throughput increase of approximately 1.5–2x. This matches.

## References

### Production Cases
- [Appwrite: 91% boost in API Performance](https://dev.to/appwrite/appwrite-0-7-91-boost-in-api-performance-144n)
- [IdleMMO: From Zero to 35M with Laravel Octane](https://www.galahadsixteen.com/blog/from-zero-to-35m-the-struggles-of-scaling-laravel-with-octane)

### Independent Benchmarks
- [BytePursuits: PHP-FPM vs Swoole](https://bytepursuits.com/benchmarking-of-php-application-with-php-fpm-vs-swoole-openswoole)
- [kenashkov: swoole-performance-tests (GitHub)](https://github.com/kenashkov/swoole-performance-tests)
- [PHP runtimes benchmark — Symfony 7 (DEV.to)](https://dev.to/dimdev/performance-benchmark-of-php-runtimes-2lmc)

### Frameworks and Runtimes
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)
- [Hyperf — coroutine-based PHP framework](https://github.com/hyperf/hyperf)
- [OpenSwoole benchmark](https://openswoole.com/benchmark)
- [Swoole source (GitHub)](https://github.com/swoole/swoole-src)
