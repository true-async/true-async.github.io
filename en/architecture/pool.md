---
layout: architecture
lang: en
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /en/architecture/pool.html
page_title: "Async\\Pool Architecture"
description: "Internal design of the universal resource pool Async\\Pool -- data structures, acquire/release algorithms, healthcheck, circuit breaker."
---

# Async\Pool Architecture

> This article describes the internal design of the universal resource pool.
> If you are looking for a usage guide, see [Async\Pool](/en/docs/components/pool.html).
> For the PDO-specific layer, see [PDO Pool Architecture](/en/architecture/pdo-pool.html).

## Data Structure

The pool is implemented in two layers: a public ABI structure in the PHP core
and an extended internal structure in the async extension.

![Pool Data Structures](/diagrams/ru/architecture-pool/data-structures.svg)

## Two Creation Paths

A pool can be created from PHP code (via the `Async\Pool` constructor)
or from a C extension (via the internal API).

| Path  | Function                            | Callbacks                      | Used by                |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | User code              |
| C API | `zend_async_pool_create_internal()` | function pointers              | PDO, other extensions  |

The difference is in `handler_flags`. When the flag is set, the pool calls the C function directly,
bypassing the overhead of calling a PHP callable through `zend_call_function()`.

## Acquire: Obtaining a Resource

![acquire() -- Internal Algorithm](/diagrams/ru/architecture-pool/acquire.svg)

### Waiting for a Resource

When all resources are busy and `max_size` is reached, the coroutine suspends
via `ZEND_ASYNC_SUSPEND()`. The waiting mechanism is similar to channels:

1. A `zend_async_pool_waiter_t` structure is created
2. The waiter is added to the FIFO `waiters` queue
3. A callback for wake-up is registered
4. If a timeout is set -- a timer is registered
5. `ZEND_ASYNC_SUSPEND()` -- the coroutine yields control

Wake-up occurs when another coroutine calls `release()`.

## Release: Returning a Resource

![release() -- Internal Algorithm](/diagrams/ru/architecture-pool/release.svg)

## Healthcheck: Background Monitoring

If `healthcheckInterval > 0`, a periodic timer is started when the pool is created.
The timer is integrated with the reactor via `ZEND_ASYNC_NEW_TIMER_EVENT`.

![Healthcheck -- Periodic Check](/diagrams/ru/architecture-pool/healthcheck.svg)

The healthcheck verifies **only** free resources. Busy resources are not affected.
If, after removing dead resources, the total count drops below `min`, the pool creates replacements.

## Circular Buffer

Free resources are stored in a circular buffer -- a ring buffer with fixed capacity.
The initial capacity is 8 elements, expanded as needed.

`push` and `pop` operations run in O(1). The buffer uses two pointers (`head` and `tail`),
enabling efficient addition and extraction of resources without moving elements.

## Integration with the Event System

The pool inherits from `zend_async_event_t` and implements a full set of event handlers:

| Handler        | Purpose                                                    |
|----------------|------------------------------------------------------------|
| `add_callback` | Register a callback (for waiters)                          |
| `del_callback` | Remove a callback                                          |
| `start`        | Start the event (NOP)                                      |
| `stop`         | Stop the event (NOP)                                       |
| `dispose`      | Full cleanup: free memory, destroy callbacks               |

This enables:
- Suspending and resuming coroutines via event callbacks
- Integrating the healthcheck timer with the reactor
- Properly releasing resources through event disposal

## Garbage Collection

The PHP pool wrapper (`async_pool_obj_t`) implements a custom `get_gc`
that registers all resources from the idle buffer as GC roots.
This prevents premature garbage collection of free resources
that have no explicit references from PHP code.

## Circuit Breaker

The pool implements the `CircuitBreaker` interface with three states:

![Circuit Breaker States](/diagrams/ru/architecture-pool/circuit-breaker.svg)

Transitions can be manual or automatic via `CircuitBreakerStrategy`:
- `reportSuccess()` is called on a successful `release` (resource passed `beforeRelease`)
- `reportFailure()` is called when `beforeRelease` returned `false`
- The strategy decides when to switch states

## Close: Shutting Down the Pool

When the pool is closed:

1. The pool event is marked as CLOSED
2. The healthcheck timer is stopped
3. All waiting coroutines are woken up with a `PoolException`
4. All free resources are destroyed via `destructor`
5. Busy resources continue to live -- they will be destroyed upon `release`

## C API for Extensions

Extensions (PDO, Redis, etc.) use the pool through macros:

| Macro                                            | Function                     |
|--------------------------------------------------|------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Create pool with C callbacks |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | Create PHP wrapper for pool  |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Acquire a resource           |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Release a resource           |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Close the pool               |

All macros call function pointers registered by the async extension at load time.
This ensures isolation: the PHP core does not depend on the specific pool implementation.

## Sequence: Full Acquire-Release Cycle

![Full acquire -> use -> release Cycle](/diagrams/ru/architecture-pool/full-cycle.svg)

## What's Next?

- [Async\Pool: Guide](/en/docs/components/pool.html) -- how to use the pool
- [PDO Pool Architecture](/en/architecture/pdo-pool.html) -- PDO-specific layer
- [Coroutines](/en/docs/components/coroutines.html) -- how coroutines work
