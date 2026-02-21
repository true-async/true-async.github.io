---
layout: architecture
lang: en
path_key: "/architecture.html"
nav_active: architecture
permalink: /en/architecture.html
page_title: "Architecture"
description: "Internal design of TrueAsync components -- resource pool, PDO Pool, diagrams, and C API."
---

## Overview

The architecture section describes the internal design of key TrueAsync components
at the C-code level: data structures, algorithms, integration with Zend Engine,
and interaction between the PHP core and the async extension.

These materials are intended for developers who want to understand
how TrueAsync works "under the hood" or plan to create their own
extensions.

### [TrueAsync ABI](/en/architecture/zend-async-api.html)

The heart of the asynchronous ABI: function pointers, extension registration system,
global state (`zend_async_globals_t`), `ZEND_ASYNC_*` macros,
and API versioning.

### [Coroutines, Scheduler, and Reactor](/en/architecture/scheduler-reactor.html)

Internal design of the coroutine scheduler and event reactor:
queues (circular buffers), context switching via fiber,
microtasks, libuv event loop, fiber context pool, and graceful shutdown.

### [Events and the Event Model](/en/architecture/events.html)

`zend_async_event_t` -- the base data structure from which
all asynchronous primitives inherit. Callback system, ref-counting,
event reference, flags, event type hierarchy.

### [Waker -- Wait and Wake-up Mechanism](/en/architecture/waker.html)

Waker is the link between a coroutine and events.
Statuses, `resume_when`, coroutine callbacks, error delivery,
`zend_coroutine_t` structure, and switch handlers.

### [Garbage Collection in Asynchronous Context](/en/architecture/async-gc.html)

How PHP GC works with coroutines, scope, and contexts: `get_gc` handlers,
fiber stack traversal, zombie coroutines, hierarchical context,
and protection against circular references.

## Components

### [Async\Pool](/en/architecture/pool.html)

Universal resource pool. Covered topics:
- Two-level data structure (ABI in the core + internal in the extension)
- Acquire/release algorithms with a FIFO queue of waiting coroutines
- Healthcheck via periodic timer
- Circuit Breaker with three states
- C API for extensions (`ZEND_ASYNC_POOL_*` macros)

### [PDO Pool](/en/architecture/pdo-pool.html)

PDO-specific layer on top of `Async\Pool`. Covered topics:
- Template connection and deferred creation of real connections
- Binding connections to coroutines via HashTable
- Pinning during active transactions and statements
- Automatic rollback and cleanup on coroutine completion
- Credentials management in the factory
