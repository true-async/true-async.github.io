---
layout: page
lang: en
path_key: "/motivation.html"
nav_active: motivation
permalink: /en/motivation.html
page_title: "Motivation"
description: "Why PHP needs built-in asynchronous capabilities"
---

## Why does PHP need asynchrony?

`PHP` is one of the last major languages that still lacks built-in
support for concurrent execution **at the language level**. Python has `asyncio`, `JavaScript` is natively
built on an event loop, `Go` has goroutines, `Kotlin` has coroutines. `PHP` remains
in the "one request — one process" paradigm, even though most
real-world applications spend the majority of their time waiting for `I/O` (`IO Bound`).

## The fragmentation problem

Today, asynchrony in `PHP` is implemented through extensions: `Swoole`, `AMPHP`, `ReactPHP`.
Each creates **its own ecosystem** with incompatible `APIs`,
its own database drivers, `HTTP` clients and servers.

This leads to critical problems:

- **Code duplication** — each extension is forced to rewrite drivers
  for `MySQL`, `PostgreSQL`, `Redis` and other systems
- **Incompatibility** — a library written for `Swoole` doesn't work with `AMPHP`,
  and vice versa
- **Limitations** — extensions cannot make standard `PHP` functions
  (`file_get_contents`, `fread`, `curl_exec`) non-blocking,
  because they don't have access to the core
- **Barrier to entry** — developers need to learn a separate ecosystem
  instead of using familiar tools

## The solution: core integration

`TrueAsync` takes a different approach — **asynchrony at the PHP core level**.
This means:

### Transparency

Existing synchronous code works in coroutines without changes.
`file_get_contents()`, `PDO::query()`, `curl_exec()` — all these functions
automatically become non-blocking when executed inside a coroutine.

```php
// This code already runs concurrently!
spawn(function() {
    $data = file_get_contents('https://api.example.com/users');
    // the coroutine suspends during the HTTP request,
    // other coroutines continue running
});
```

### No colored functions

Unlike Python (`async def` / `await`) and JavaScript (`async` / `await`),
`TrueAsync` does not require marking functions as asynchronous.
Any function can run inside a coroutine — there is no split between a "synchronous"
and "asynchronous" world.

### A unified standard

The standard `True Async ABI` as part of `Zend` allows **any** extension to support non-blocking `I/O`:
`MySQL`, `PostgreSQL`, `Redis`, file operations, sockets — all through a single interface.
No more duplicating drivers for each async framework.

### Backward compatibility

Existing code continues to work, but now all PHP code
is asynchronous by default. Everywhere.

## PHP workload: why this matters right now

A typical PHP application (Laravel, Symfony, WordPress) spends
**70–90% of its time waiting for I/O**: database queries, HTTP calls to external APIs,
file reads. All that time, the CPU sits idle.

With coroutines, this time is used efficiently:

| Scenario                     | Without coroutines | With coroutines  |
|------------------------------|--------------------|------------------|
| 3 DB queries at 20ms each    | 60ms               | ~22ms            |
| HTTP + DB + file             | sequential         | parallel         |
| 10 API calls                 | 10 × latency       | ~1 × latency     |

Learn more:
[IO-Bound vs CPU-Bound](/en/docs/evidence/concurrency-efficiency.html),
[Concurrency Statistics](/en/docs/evidence/real-world-statistics.html).

## Practical scenarios

- **Web servers** — handling many requests in a single process
  (`FrankenPHP`, `RoadRunner`)
- **API Gateway** — parallel data aggregation from multiple microservices
- **Background tasks** — concurrent queue processing
- **Real-time** — WebSocket servers, chatbots, streaming

## See also:

- [PHP RFC: True Async &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}
- [RFC: Scope and Structured Concurrency](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}
- [TrueAsync Documentation](/en/docs.html)
- [Interactive Coroutine Demo](/en/interactive/coroutine-demo.html)
