---
layout: architecture
lang: en
path_key: "/architecture/pdo-pool.html"
nav_active: architecture
permalink: /en/architecture/pdo-pool.html
page_title: "PDO Pool Architecture"
description: "Internal design of PDO Pool -- components, connection lifecycle, binding to coroutines, credentials management."
---

# PDO Pool Architecture

> This article describes the internal design of PDO Pool.
> If you are looking for a usage guide, see [PDO Pool: Connection Pool](/en/docs/components/pdo-pool.html).

## Two-Level Architecture

PDO Pool consists of two layers:

**1. PDO Core (`pdo_pool.c`)** -- logic for binding connections to coroutines,
transaction management, statement reference counting.

**2. Async Pool (`zend_async_pool_t`)** -- the universal resource pool from the async extension.
Manages the queue of free connections, limits, and healthchecks.
It knows nothing about PDO -- it works with abstract `zval` values.

This separation allows using the same pooling mechanism
for any resources, not just databases.

## Component Diagram

![PDO Pool -- Components](/diagrams/ru/architecture-pdo-pool/components.svg)

## Template Connection

When creating a `PDO` with a pool, the core **does not open** a real TCP connection.
Instead, a **template** is created -- a `pdo_dbh_t` object that stores
the DSN, username, password, and a reference to the driver. All real connections are created later,
on demand, based on this template.

For the template, `db_handle_init_methods()` is called instead of `db_handle_factory()`.
This method sets the driver's method table (`dbh->methods`)
but does not create a TCP connection or allocate `driver_data`.

## Connection Lifecycle

![Connection Lifecycle in the Pool](/diagrams/ru/architecture-pdo-pool/lifecycle.svg)

## Creating a Connection from the Pool (Sequence)

![Creating a Connection from the Pool](/diagrams/ru/architecture-pdo-pool/connection-sequence.svg)

## Internal API

### pdo_pool.c -- Public Functions

| Function                   | Purpose                                                        |
|----------------------------|----------------------------------------------------------------|
| `pdo_pool_create()`        | Creates a pool for `pdo_dbh_t` based on constructor attributes |
| `pdo_pool_destroy()`       | Releases all connections, closes the pool, clears the hash table |
| `pdo_pool_acquire_conn()`  | Returns a connection for the current coroutine (reuse or acquire) |
| `pdo_pool_peek_conn()`     | Returns the bound connection without acquire (NULL if none)    |
| `pdo_pool_maybe_release()` | Returns the connection to the pool if no transaction or statements |
| `pdo_pool_get_wrapper()`   | Returns the `Async\Pool` PHP object for the `getPool()` method |

### pdo_pool.c -- Internal Callbacks

| Callback                    | When Called                                               |
|-----------------------------|-----------------------------------------------------------|
| `pdo_pool_factory()`        | Pool needs a new connection (acquire when pool is empty)  |
| `pdo_pool_destructor()`     | Pool destroys a connection (on close or eviction)         |
| `pdo_pool_healthcheck()`    | Periodic check -- is the connection still alive?          |
| `pdo_pool_before_release()` | Before returning to pool -- rollback uncommitted transactions |
| `pdo_pool_free_conn()`      | Closes the driver connection, frees memory                |

### Binding to a Coroutine

Connections are bound to coroutines via a `pool_connections` hash table,
where the key is the coroutine identifier and the value is a pointer to `pdo_dbh_t`.

The coroutine identifier is computed by the `pdo_pool_coro_key()` function:
- If the coroutine is a PHP object -- `zend_object.handle` (sequential uint32_t) is used
- For internal coroutines -- the pointer address shifted by `ZEND_MM_ALIGNMENT_LOG2`

### Cleanup on Coroutine Completion

When a connection is bound to a coroutine, a `pdo_pool_cleanup_callback` is registered
via `coro->event.add_callback()`. When the coroutine completes (normally or with an error),
the callback automatically returns the connection to the pool. This guarantees no connection leaks
even with unhandled exceptions.

### Pinning: Connection Locking

A connection is pinned to a coroutine and will not return to the pool if at least one condition is met:

- `conn->in_txn == true` -- an active transaction
- `conn->pool_slot_refcount > 0` -- there are live statements (`PDOStatement`) using this connection

The refcount is incremented when a statement is created and decremented when it is destroyed.
When both conditions are cleared, `pdo_pool_maybe_release()` returns the connection to the pool.

## Credentials Management in the Factory

When creating a new connection, `pdo_pool_factory()` **copies** the
DSN, username, and password strings from the template via `estrdup()`. This is necessary because
drivers may mutate these fields during `db_handle_factory()`:

- **PostgreSQL** -- replaces `;` with spaces in `data_source`
- **MySQL** -- allocates `username`/`password` from DSN if they were not passed
- **ODBC** -- completely rebuilds `data_source`, embedding credentials

After a successful `db_handle_factory()` call, the copies are freed via `efree()`.
On error, freeing happens through `pdo_pool_free_conn()`,
which is also used by the pool's destructor.

## Incompatibility with Persistent Connections

Persistent connections (`PDO::ATTR_PERSISTENT`) are incompatible with the pool.
A persistent connection is bound to the process and survives across requests,
while the pool creates connections at the request level with automatic lifecycle management.
Attempting to enable both attributes simultaneously will result in an error.

## What's Next?

- [PDO Pool: Connection Pool](/en/docs/components/pdo-pool.html) -- usage guide
- [Coroutines](/en/docs/components/coroutines.html) -- how coroutines work
- [Scope](/en/docs/components/scope.html) -- managing coroutine groups
