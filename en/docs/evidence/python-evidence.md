---
layout: docs
lang: en
path_key: "/docs/evidence/python-evidence.html"
nav_active: docs
permalink: /en/docs/evidence/python-evidence.html
page_title: "Python asyncio"
description: "Python asyncio in practice: Duolingo, Super.com, Instagram, uvloop benchmarks, counter-arguments."
---

# Python asyncio in Practice: Real-World Measurements

Python is the language most similar to PHP in terms of execution model:
interpreted, single-threaded (GIL), with a dominance of synchronous frameworks.
The transition from synchronous Python (Flask, Django + Gunicorn) to asynchronous
(FastAPI, aiohttp, Starlette + Uvicorn) is a precise analogy to the transition
from PHP-FPM to a coroutine-based runtime.

Below is a collection of production cases, independent benchmarks, and measurements.

---

## 1. Production: Duolingo — Migration to Async Python (+40% Throughput)

[Duolingo](https://blog.duolingo.com/async-python-migration/) is the largest
language learning platform (500M+ users).
The backend is written in Python.

In 2025, the team began a systematic migration of services from synchronous
Python to async.

| Metric                | Result                                  |
|-----------------------|-----------------------------------------|
| Throughput per instance | **+40%**                              |
| AWS EC2 cost savings  | **~30%** per migrated service           |

The authors note that after building the async infrastructure, migrating
individual services turned out to be "fairly straightforward."

**Source:** [How We Started Our Async Python Migration (Duolingo Blog, 2025)](https://blog.duolingo.com/async-python-migration/)

---

## 2. Production: Super.com — 90% Cost Reduction

[Super.com](https://www.super.com/) (formerly Snaptravel) is a hotel search
and discount service. Their search engine handles 1,000+ req/s,
ingests 1 TB+ of data per day, and processes $1M+ in sales daily.

**Key workload characteristic:** each request makes **40+ network calls**
to third-party APIs. This is a pure I/O-bound profile — an ideal candidate for coroutines.

The team migrated from Flask (synchronous, AWS Lambda) to Quart (ASGI, EC2).

| Metric                   | Flask (Lambda) | Quart (ASGI)  | Change         |
|--------------------------|----------------|---------------|----------------|
| Infrastructure costs     | ~$1,000/day    | ~$50/day      | **−90%**       |
| Throughput               | ~150 req/s     | 300+ req/s    | **2x**         |
| Errors during peak hours | Baseline       | −95%          | **−95%**       |
| Latency                  | Baseline       | −50%          | **2x faster**  |

Savings of $950/day × 365 = **~$350,000/year** on a single service.

**Source:** [How we optimized service performance using Quart ASGI and reduced costs by 90% (Super.com, Medium)](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)

---

## 3. Production: Instagram — asyncio at 500M DAU Scale

Instagram serves 500+ million daily active users
on a Django backend.

Jimmy Lai (Instagram engineer) described the migration to asyncio in a talk
at PyCon Taiwan 2018:

- Replaced `requests` with `aiohttp` for HTTP calls
- Migrated internal RPC to `asyncio`
- Achieved API performance improvement and reduced CPU idle time

**Challenges:** High CPU overhead of asyncio at Instagram's scale,
the need for automated detection of blocking calls through
static code analysis.

**Source:** [The journey of asyncio adoption in Instagram (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)

---

## 4. Production: Feature Store — From Threads to asyncio (−40% Latency)

The Feature Store service migrated from Python multithreading to asyncio.

| Metric          | Threads                 | Asyncio              | Change                  |
|-----------------|-------------------------|----------------------|-------------------------|
| Latency         | Baseline                | −40%                 | **−40%**                |
| RAM consumption | 18 GB (hundreds of threads) | Significantly less | Substantial reduction   |

The migration was carried out in three phases with 50/50 production traffic
splitting for validation.

**Source:** [How We Migrated from Python Multithreading to Asyncio (Medium)](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)

---

## 5. Production: Talk Python — Flask to Quart (−81% Latency)

[Talk Python](https://talkpython.fm/) is one of the largest Python podcasts
and learning platforms. The author (Michael Kennedy) rewrote the site
from Flask (synchronous) to Quart (asynchronous Flask).

| Metric                | Flask | Quart | Change      |
|-----------------------|-------|-------|-------------|
| Response time (example) | 42 ms | 8 ms | **−81%**   |
| Bugs after migration  | —     | 2     | Minimal     |

The author notes: during load testing, the maximum req/s
differed insignificantly because MongoDB queries took <1 ms.
The gain appears during **concurrent** request processing —
when multiple clients access the server simultaneously.

**Source:** [Talk Python rewritten in Quart (async Flask)](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)

---

## 6. Microsoft Azure Functions — uvloop as Standard

Microsoft included [uvloop](https://github.com/MagicStack/uvloop) —
a fast event loop based on libuv — as the default for Azure Functions
on Python 3.13+.

| Test                           | Standard asyncio | uvloop      | Improvement |
|--------------------------------|------------------|-------------|-------------|
| 10K requests, 50 VU (local)   | 515 req/s        | 565 req/s   | **+10%**    |
| 5 min, 100 VU (Azure)         | 1,898 req/s      | 1,961 req/s | **+3%**     |
| 500 VU (local)                | 720 req/s        | 772 req/s   | **+7%**     |

The standard event loop at 500 VU showed **~2% request losses**.
uvloop — zero errors.

**Source:** [Faster Python on Azure Functions with uvloop (Microsoft, 2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

---

## 7. Benchmark: I/O-bound Tasks — asyncio 130x Faster

Direct comparison of concurrency models on a task of downloading 10,000 URLs:

| Model        | Time     | Throughput     | Errors    |
|--------------|----------|----------------|-----------|
| Synchronous  | ~1,800 s | ~11 KB/s       | —         |
| Threads (100)| ~85 s    | ~238 KB/s      | Low       |
| **Asyncio**  | **14 s** | **1,435 KB/s** | **0.06%** |

Asyncio: **130x faster** than synchronous code, **6x faster** than threads.

For CPU-bound tasks, asyncio provides no advantage
(identical time, +44% memory consumption).

**Source:** [Python Concurrency Model Comparison (Medium, 2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)

---

## 8. Benchmark: uvloop — Faster Than Go and Node.js

[uvloop](https://github.com/MagicStack/uvloop) is a drop-in replacement for the standard
asyncio event loop, written in Cython on top of libuv (the same library
underlying Node.js).

TCP echo server:

| Implementation      | 1 KiB (req/s) | 100 KiB throughput |
|---------------------|---------------|--------------------|
| **uvloop**          | **105,459**   | **2.3 GiB/s**      |
| Go                  | 103,264       | —                  |
| Standard asyncio    | 41,420        | —                  |
| Node.js             | 44,055        | —                  |

HTTP server (300 concurrent):

| Implementation         | 1 KiB (req/s) |
|------------------------|---------------|
| **uvloop + httptools** | **37,866**    |
| Node.js                | Lower         |

uvloop: **2.5x faster** than standard asyncio, **2x faster** than Node.js,
**on par with Go**.

**Source:** [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)

---

## 9. Benchmark: aiohttp vs requests — 10x on Concurrent Requests

| Library       | req/s (concurrent) | Type  |
|---------------|---------------------|-------|
| **aiohttp**   | **241+**            | Async |
| HTTPX (async) | ~160                | Async |
| Requests      | ~24                 | Sync  |

aiohttp: **10x faster** than Requests for concurrent HTTP requests.

**Source:** [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)

---

## 10. Counter-argument: Cal Paterson — "Async Python Is Not Faster"

It is important to present counter-arguments as well. Cal Paterson conducted a thorough benchmark
with a **real database** (PostgreSQL, random row selection + JSON):

| Framework                    | Type  | req/s     | P99 Latency |
|------------------------------|-------|-----------|-------------|
| Gunicorn + Meinheld/Bottle   | Sync  | **5,780** | **32 ms**   |
| Gunicorn + Meinheld/Falcon   | Sync  | **5,589** | **31 ms**   |
| Uvicorn + Starlette          | Async | 4,952     | 75 ms       |
| Sanic                        | Async | 4,687     | 85 ms       |
| AIOHTTP                      | Async | 4,501     | 76 ms       |

**Result:** synchronous frameworks with C servers showed **higher throughput**
and **2–3x better tail latency** (P99).

### Why Did Async Lose?

Reasons:

1. **A single SQL query** per HTTP request — too little I/O
   for coroutine concurrency to have an effect.
2. **Cooperative multitasking** with CPU work between requests
   creates "unfair" CPU time distribution —
   long computations block the event loop for everyone.
3. **asyncio overhead** (standard event loop in Python)
   is comparable to the gain from non-blocking I/O when I/O is minimal.

### When Async Actually Helps

Paterson's benchmark tests the **simplest scenario** (1 SQL query).
As the production cases above demonstrate, async provides a dramatic gain when:

- There are **many** DB / external API queries (Super.com: 40+ calls per request)
- Concurrency is **high** (thousands of simultaneous connections)
- I/O **dominates** over CPU (Duolingo, Appwrite)

This aligns with theory:
the higher the blocking coefficient (T_io/T_cpu), the greater the benefit from coroutines.
With 1 SQL query × 2 ms, the coefficient is too low.

**Source:** [Async Python is not faster (Cal Paterson)](https://calpaterson.com/async-python-is-not-faster.html)

---

## 11. TechEmpower: Python Frameworks

Approximate results from [TechEmpower Round 22](https://www.techempower.com/benchmarks/):

| Framework         | Type       | req/s (JSON)          |
|-------------------|------------|-----------------------|
| Uvicorn (raw)     | Async ASGI | Highest among Python  |
| Starlette         | Async ASGI | ~20,000–25,000        |
| FastAPI           | Async ASGI | ~15,000–22,000        |
| Flask (Gunicorn)  | Sync WSGI  | ~4,000–6,000          |
| Django (Gunicorn) | Sync WSGI  | ~2,000–4,000          |

Async frameworks: **3–5x** faster than synchronous ones in the JSON test.

**Source:** [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

---

## Summary: What Python Data Shows

| Case                       | Sync → Async                           | Condition                              |
|----------------------------|----------------------------------------|----------------------------------------|
| Duolingo (production)      | **+40%** throughput, **−30%** cost     | Microservices, I/O                     |
| Super.com (production)     | **2x** throughput, **−90%** cost       | 40+ API calls per request              |
| Feature Store (production) | **−40%** latency                       | Migration from threads to asyncio      |
| Talk Python (production)   | **−81%** latency                       | Flask → Quart                          |
| I/O-bound (10K URLs)       | **130x** faster                        | Pure I/O, massive concurrency          |
| aiohttp vs requests        | **10x** faster                         | Concurrent HTTP requests               |
| uvloop vs standard         | **2.5x** faster                        | TCP echo, HTTP                         |
| TechEmpower JSON           | **3–5x**                               | FastAPI/Starlette vs Flask/Django      |
| **Simple CRUD (1 SQL)**    | **Sync is faster**                     | Cal Paterson: P99 2–3x worse for async |
| **CPU-bound**              | **No difference**                      | +44% memory, 0% gain                   |

### Key Takeaway

Async Python provides maximum benefit with a **high blocking coefficient**:
when I/O time significantly exceeds CPU time.
With 40+ network calls (Super.com) — 90% cost savings.
With 1 SQL query (Cal Paterson) — async is slower.

This **confirms the formula** from [IO-bound Task Efficiency](/en/docs/evidence/concurrency-efficiency.html):
gain ≈ 1 + T_io/T_cpu. When T_io >> T_cpu — tens to hundreds of times.
When T_io ≈ T_cpu — minimal or zero.

---

## Connection to PHP and True Async

Python and PHP are in a similar situation:

| Characteristic         | Python               | PHP                 |
|------------------------|----------------------|---------------------|
| Interpreted            | Yes                  | Yes                 |
| GIL / single-threaded  | GIL                  | Single-threaded     |
| Dominant model         | Sync (Django, Flask) | Sync (FPM)          |
| Async runtime          | asyncio + uvloop     | Swoole / True Async |
| Async framework        | FastAPI, Starlette   | Hyperf              |

Python data shows that transitioning to coroutines in a single-threaded
interpreted language **works**. The scale of the gain
is determined by the workload profile, not the language.

---

## References

### Production Cases
- [Duolingo: How We Started Our Async Python Migration (2025)](https://blog.duolingo.com/async-python-migration/)
- [Super.com: Quart ASGI, 90% cost reduction](https://medium.com/super/how-we-optimized-service-performance-using-the-python-quart-asgi-framework-and-reduced-costs-by-1362dc365a0)
- [Instagram: asyncio adoption at scale (PyCon Taiwan 2018)](https://www.slideshare.net/jimmy_lai/the-journey-of-asyncio-adoption-in-instagram)
- [Feature Store: Multithreading to Asyncio](https://medium.com/@DorIndivo/how-we-migrated-from-python-multithreading-to-asyncio-128b0c8e4ec5)
- [Talk Python: Flask → Quart rewrite](https://talkpython.fm/blog/posts/talk-python-rewritten-in-quart-async-flask/)
- [Microsoft Azure: uvloop as default (2025)](https://techcommunity.microsoft.com/blog/appsonazureblog/faster-python-on-azure-functions-with-uvloop/4455323)

### Benchmarks
- [Cal Paterson: Async Python is not faster](https://calpaterson.com/async-python-is-not-faster.html)
- [Python Concurrency Model Comparison (2025)](https://medium.com/@romualdoluwatobi/python-concurrency-model-comparison-for-cpu-and-io-bound-execution-asyncio-vs-threads-vs-sync-35c114fc0045)
- [HTTPX vs Requests vs AIOHTTP (Oxylabs)](https://oxylabs.io/blog/httpx-vs-requests-vs-aiohttp)
- [uvloop: Blazing fast Python networking (MagicStack)](https://magic.io/blog/uvloop-blazing-fast-python-networking/)
- [TechEmpower Framework Benchmarks](https://www.techempower.com/benchmarks/)

### Coroutines vs Threads
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/)
- [Super Fast Python: Asyncio Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)
