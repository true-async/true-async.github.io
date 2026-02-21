---
layout: docs
lang: en
path_key: "/docs/evidence/coroutines-evidence.html"
nav_active: docs
permalink: /en/docs/evidence/coroutines-evidence.html
page_title: "Why Coroutines Work"
description: "Empirical evidence: context switch cost measurements, memory comparison, the C10K problem, academic research."
---

# Empirical Evidence: Why Single-Threaded Coroutines Work

The claim that single-threaded cooperative concurrency is effective
for IO-bound workloads is supported by measurements, academic research,
and operational experience with large-scale systems.

---

## 1. Switching Cost: Coroutine vs OS Thread

The main advantage of coroutines is that cooperative switching occurs
in user space, without invoking the OS kernel.

### Measurements on Linux

| Metric                 | OS Thread (Linux NPTL)                   | Coroutine / async task                 |
|------------------------|------------------------------------------|----------------------------------------|
| Context switch         | 1.2–1.5 µs (pinned), ~2.2 µs (unpinned) | ~170 ns (Go), ~200 ns (Rust async)     |
| Task creation          | ~17 µs                                   | ~0.3 µs                               |
| Memory per task        | ~9.5 KiB (min), 8 MiB (default stack)   | ~0.4 KiB (Rust), 2–4 KiB (Go)         |
| Scalability            | ~80,000 threads (test)                   | 250,000+ async tasks (test)            |

**Sources:**
- [Eli Bendersky, Measuring context switching and memory overheads for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/) —
  direct measurements of Linux thread switching costs and comparison with goroutines
- [Jim Blandy, context-switch (Rust benchmark)](https://github.com/jimblandy/context-switch) —
  async task switches in ~0.2 µs vs ~1.7 µs for a thread (**8.5x** faster),
  created in 0.3 µs vs 17 µs (**56x** faster), uses 0.4 KiB vs 9.5 KiB (**24x** less)

### What This Means in Practice

Switching a coroutine costs **~200 nanoseconds** — an order of magnitude cheaper
than switching an OS thread (~1.5 µs).
But even more importantly, coroutine switching **does not incur indirect costs**:
TLB cache flush, branch predictor invalidation, migration between cores —
all of these are characteristic of threads, but not of coroutines within a single thread.

For an event loop handling 80 coroutines per core,
the total switching overhead is:

```
80 × 200 ns = 16 µs for a full cycle through all coroutines
```

This is negligible compared to 80 ms of I/O wait time.

---

## 2. Memory: Scale of Differences

OS threads allocate a fixed-size stack (8 MiB by default on Linux).
Coroutines store only their state — local variables and the resumption point.

| Implementation                | Memory per unit of concurrency                            |
|-------------------------------|-----------------------------------------------------------|
| Linux thread (default stack)  | 8 MiB virtual, ~10 KiB RSS minimum                       |
| Go goroutine                  | 2–4 KiB (dynamic stack, grows as needed)                  |
| Kotlin coroutine              | tens of bytes on heap; thread:coroutine ratio ≈ 6:1       |
| Rust async task               | ~0.4 KiB                                                  |
| C++ coroutine frame (Pigweed) | 88–408 bytes                                              |
| Python asyncio coroutine      | ~2 KiB (vs ~5 KiB + 32 KiB stack for a thread)           |

**Sources:**
- [Kotlin Coroutines vs Threads Memory Benchmark (TechYourChance)](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/) — 6:1 memory ratio
- [Super Fast Python: Coroutines Use Less Memory Than Threads](https://superfastpython.com/coroutines-less-memory-threads/) — comparison in Python
- [Go FAQ: goroutines](https://go.dev/doc/faq#goroutines) — dynamic goroutine stack

### Implications for Web Servers

For 640 concurrent tasks (8 cores × 80 coroutines):

- **OS threads**: 640 × 8 MiB = 5 GiB of virtual memory
  (actually less due to lazy allocation, but the pressure on the OS scheduler is significant)
- **Coroutines**: 640 × 4 KiB = 2.5 MiB
  (a difference of **three orders of magnitude**)

---

## 3. The C10K Problem and Real Servers

### The Problem

In 1999, Dan Kegel formulated the
[C10K problem](https://www.kegel.com/c10k.html):
servers using the "one thread per connection" model were unable to serve
10,000 simultaneous connections.
The cause was not hardware limitations, but OS thread overhead.

### The Solution

The problem was solved by transitioning to an event-driven architecture:
instead of creating a thread for each connection,
a single event loop serves thousands of connections in one thread.

This is exactly the approach implemented by **nginx**, **Node.js**, **libuv**, and — in the PHP context — **True Async**.

### Benchmarks: nginx (event-driven) vs Apache (thread-per-request)

| Metric (1000 concurrent connections) | nginx        | Apache                           |
|--------------------------------------|--------------|----------------------------------|
| Requests per second (static)         | 2,500–3,000  | 800–1,200                        |
| HTTP/2 throughput                    | >6,000 req/s | ~826 req/s                       |
| Stability under load                | Stable       | Degradation at >150 connections  |

nginx serves **2–4x** more requests than Apache,
while consuming significantly less memory.
Apache with thread-per-request architecture accepts no more than 150 simultaneous connections
(by default), after which new clients wait in a queue.

**Sources:**
- [Dan Kegel, The C10K problem (1999)](https://www.kegel.com/c10k.html) — problem statement
- [Nginx vs Apache: Web Server Performance Comparison (2025)](https://wehaveservers.com/blog/linux-sysadmin/nginx-vs-apache-which-web-server-is-faster-in-2025/) — benchmarks
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/) — industry experience

---

## 4. Academic Research

### SEDA: Staged Event-Driven Architecture (Welsh et al., 2001)

Matt Welsh, David Culler, and Eric Brewer from UC Berkeley proposed
SEDA — a server architecture based on events and queues between processing stages.

**Key result**: The SEDA server in Java outperformed
Apache (C, thread-per-connection) in throughput at 10,000+ simultaneous connections.
Apache could not accept more than 150 simultaneous connections.

> Welsh M., Culler D., Brewer E. *SEDA: An Architecture for Well-Conditioned,
> Scalable Internet Services.* SOSP '01 (2001).
> [PDF](https://www.sosp.org/2001/papers/welsh.pdf)

### Comparison of Web Server Architectures (Pariag et al., 2007)

The most thorough comparison of architectures was conducted by Pariag et al.
from the University of Waterloo. They compared three servers on the same codebase:

- **µserver** — event-driven (SYMPED, single process)
- **Knot** — thread-per-connection (Capriccio library)
- **WatPipe** — hybrid (pipeline, similar to SEDA)

**Key result**: The event-driven µserver and pipeline-based WatPipe
delivered **~18% higher throughput** than the thread-based Knot.
WatPipe required 25 writer threads to achieve the same performance
as µserver with 10 processes.

> Pariag D. et al. *Comparing the Performance of Web Server Architectures.*
> EuroSys '07 (2007).
> [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)

### AEStream: Accelerating Event Processing with Coroutines (2022)

A study published on arXiv conducted a direct comparison
of coroutines and threads for stream data processing (event-based processing).

**Key result**: Coroutines delivered **at least 2x throughput**
compared to conventional threads for event stream processing.

> Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* (2022).
> [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

---

## 5. Scalability: 100,000 Tasks

### Kotlin: 100,000 Coroutines in 100 ms

In the [TechYourChance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
benchmark, creating and launching 100,000 coroutines took ~100 ms of overhead.
An equivalent number of threads would require ~1.7 seconds just for creation
(100,000 × 17 µs) and ~950 MiB of memory for stacks.

### Rust: 250,000 Async Tasks

In the [context-switch benchmark](https://github.com/jimblandy/context-switch),
250,000 async tasks were launched in a single process,
while OS threads reached their limit at ~80,000.

### Go: Millions of Goroutines

Go routinely launches hundreds of thousands and millions of goroutines in production systems.
This is what enables servers like Caddy, Traefik, and CockroachDB
to handle tens of thousands of simultaneous connections.

---

## 6. Evidence Summary

| Claim                                              | Confirmation                                              |
|----------------------------------------------------|-----------------------------------------------------------|
| Coroutine switching is cheaper than threads         | ~200 ns vs ~1500 ns — **7–8x** (Bendersky 2018, Blandy)  |
| Coroutines consume less memory                      | 0.4–4 KiB vs 9.5 KiB–8 MiB — **24x+** (Blandy, Go FAQ)  |
| Event-driven server scales better                   | nginx 2–4x throughput vs Apache (benchmarks)              |
| Event-driven > thread-per-connection (academically) | +18% throughput (Pariag 2007), C10K solved (Kegel 1999)   |
| Coroutines > threads for event processing           | 2x throughput (AEStream 2022)                             |
| Hundreds of thousands of coroutines in one process  | 250K async tasks (Rust), 100K coroutines in 100ms (Kotlin)|
| Formula N ≈ 1 + T_io/T_cpu is correct              | Goetz 2006, Zalando, Little's Law                         |

---

## References

### Measurements and Benchmarks
- [Eli Bendersky: Measuring context switching for Linux threads (2018)](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)
- [Jim Blandy: context-switch benchmark (Rust)](https://github.com/jimblandy/context-switch)
- [TechYourChance: Kotlin Coroutines vs Threads Performance](https://www.techyourchance.com/kotlin-coroutines-vs-threads-performance-benchmark/)
- [TechYourChance: Kotlin Coroutines vs Threads Memory](https://www.techyourchance.com/kotlin-coroutines-vs-threads-memory-benchmark/)
- [Super Fast Python: Coroutines Faster Than Threads](https://superfastpython.com/asyncio-coroutines-faster-than-threads/)

### Academic Papers
- Welsh M. et al. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services.* SOSP '01. [PDF](https://www.sosp.org/2001/papers/welsh.pdf)
- Pariag D. et al. *Comparing the Performance of Web Server Architectures.* EuroSys '07. [PDF](https://people.eecs.berkeley.edu/~brewer/cs262/Pariag07.pdf)
- Pedersen J.E. et al. *AEStream: Accelerated Event-Based Processing with Coroutines.* [arXiv:2212.10719](https://arxiv.org/abs/2212.10719)

### Industry Experience
- [Dan Kegel: The C10K problem (1999)](https://www.kegel.com/c10k.html)
- [Cloudflare: How we scaled nginx](https://blog.cloudflare.com/how-we-scaled-nginx-and-saved-the-world-54-years-every-day/)
- [High Scalability: The Secret to 10 Million Concurrent Connections](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)

### See Also
- [Python asyncio in Practice](/en/docs/evidence/python-evidence.html) — production cases (Duolingo, Super.com, Instagram), uvloop benchmarks, Cal Paterson's counter-arguments
- [Swoole in Practice](/en/docs/evidence/swoole-evidence.html) — production cases and benchmarks for PHP coroutines
