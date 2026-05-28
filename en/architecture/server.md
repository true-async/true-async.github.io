---
layout: architecture
lang: en
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /en/architecture/server.html
page_title: "TrueAsync Server architecture"
description: "TrueAsync Server internals: single-threaded event loop, zero-copy, CoDel, bailout firewall, multi-worker via SO_REUSEPORT."
---

# TrueAsync Server architecture

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server is a native PHP extension (in C) that runs an HTTP server directly inside the
PHP process's address space. Architecturally it is a **single-threaded event loop** with an
optional **replicated worker pool** for horizontal scaling inside a single process.

## Big picture

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP process                          │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop thread #0                  │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP handler (coroutine) ────┐         │ │
            │   │     │     │  user code, DB, HTTP client, …  │         │ │
            │   │     │     └─────────────┬───────────────────┘         │ │
            │   │     └──────── yield ────┘                             │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop threads #1 …N-1            │ │
            │   │   (when setWorkers(N>1), SO_REUSEPORT)               │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

One thread holds the connection and the request from accept to final send. There is no
accept→worker handoff, no per-request fork/cleanup, and no global locks. When the handler needs
to wait on I/O (DB, HTTP, file), the coroutine yields to the event loop, which immediately picks
up the next ready event.

## Layers

### 1. Reactor: libuv

The base I/O layer: libuv via the [TrueAsync ABI](/en/architecture/zend-async-api.html). TCP
accepts, UDP recvmmsg, file operations, timers, sigwait — all go through the same
`zend_async_event_t` interface. The reactor knows about epoll/kqueue/IOCP; the server does not.

Critical extension API:

- `zend_async_io_*` — non-blocking socket and file reads/writes.
- `zend_async_io_sendfile_t` — `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` — async `open(2)` through the libuv thread pool.
- `udp_bind` for HTTP/3 / QUIC.

### 2. Protocol parsers

- **HTTP/1.1**: vendored [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 (the same parser
  Node.js uses).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (floor for CVE-2023-44487 rapid-reset).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, OpenSSL 3.5 QUIC TLS API (backend
  `libngtcp2_crypto_ossl`).

Protocol detection on a single TCP socket:

- plaintext: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), otherwise → llhttp.
- TLS: ALPN negotiation on handshake.

`HttpServer::addListener()` raises a multi-protocol listener. For protocol-restricted ports, use
`addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection arena

`http_connection_t` — per-connection state (768 B). Stored in a slab pool: chunks of
`CONN_ARENA_CHUNK_SLOTS` (256) slots each. Live/free is tracked via a bitmap; chunks never shrink,
which gives a hot arena hit with no allocations.

Visible through
[`HttpServer::getRuntimeStats()`](/en/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

A per-thread LIFO for large request-body buffers (≥ 1 MB). Bodies of this class are allocated
through `zend_mm` but **returned** to the per-size-class LIFO instead of the allocator. The next
request of the same size class reuses the slot — no `mmap`/`munmap` traffic and no `mmap_lock`
contention that used to cap multi-worker scaling on upload-heavy workloads.

Bench (W=8, c=128, 2 MiB POST body): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2
throughput; CPU now actually scales with workers).

Drained on `HttpServer::stop()` and RSHUTDOWN. In debug builds the zend_mm leak detector sees a
clean slate at module unload.

### 5. Coroutine integration

Every accepted request spawns a new coroutine via `ZEND_ASYNC_NEW_COROUTINE`. The coroutine runs
in a **per-request scope** that is a child of the server scope. This produces two effects:

- `Async\request_context()` resolves to a context shared across the entire request coroutine
  subtree.
- `Async\current_context()` stays per-coroutine.

Request cancellation (handler coroutine cancelled → 4xx parser limit, peer reset on the stream,
drain timeout) propagates through the normal `AsyncCancellation` chain.
`TrueAsync\HttpException extends AsyncCancellation` carries the HTTP status so the dispatcher
knows what to tell the client.

### 6. Multi-worker (optional)

`HttpServerConfig::setWorkers(N > 1)`:

1. The parent spawns an `Async\ThreadPool` of size N.
2. The config + handler set are copied into each worker via `transfer_obj` (deep copy of the entire
   graph, including closure op_arrays; see [Thread snapshot](/en/architecture/zend-async-api.html)).
3. Each worker re-binds the same listeners with `SO_REUSEPORT`.
4. The kernel (Linux/BSD) distributes accepts evenly across sockets in the same reuse-port group.
5. The parent `start()` waits for all workers to finish.

Each worker has an independent event loop, opcache, and allocator. No shared state, no locks. The
bootloader (if set) runs in each worker once before the task loop.

## CoDel backpressure

The server implements [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), adaptive
backpressure by sojourn time:

- Every request is timestamped at enqueue → dequeue.
- If sojourn (queue-wait) stays above `setBackpressureTargetMs()` (default 5 ms) for **100 ms
  in a row**, the listen socket is paused.
- As soon as sojourn drops back, the listener resumes.

Unlike a rigid `max_connections`, CoDel **tracks real pipeline load**, not just the number of
concurrent connections. This matters especially on HTTP/2, where a single connection carries an
arbitrary number of streams.

CoDel is opt-in by default — after 0.3.0, situations where CoDel triggered incorrectly on
muxed H2 (short, fast streams pushed the connection into "overloaded" and parked unrelated
long-lived streams) led to a conservative default.

## Bailout firewall

PHP fatal errors from the user handler (E_ERROR, OOM, uncaught on shutdown) **do not crash the
server**. Every protocol entry point (H1, H2, H3) wraps the handler call in a bailout fence which:

1. Drains the failing coroutine.
2. Emits 500 to the client (if headers are not on the wire yet).
3. Returns control to the listener, which keeps accepting.

Diagnostics: on the failure path the server logs the C stack (when `<execinfo.h>` is available;
gated by `HAVE_EXECINFO_H`) and the PHP-level `zend_error`. On musl / Windows the C frame dump is
silently skipped.

See [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
in the repository for one of the early bailout bugs under Tracing JIT.

## Connection draining (Step 8)

The server implements two drain models:

### Proactive: `setMaxConnectionAgeMs()`

After `(age ± 10% jitter)` lifetime the connection receives a signal:

- H1: the next response carries `Connection: close`.
- H2: a `GOAWAY` is emitted.

Equivalent to gRPC `MAX_CONNECTION_AGE`. Protects against long-lived connections "stuck" to a
single worker behind an L4 LB.

### Reactive: CoDel trip / hard-cap transition

When the server enters overload (CoDel paused or `max_connections` hit), the per-connection drain
effect is spread across the `setDrainSpreadMs()` window (equivalent to HAProxy
`close-spread-time`) so clients do not reconnect in a thundering herd.

The minimum gap between triggers is set by `setDrainCooldownMs()` (default 10 s).

## Zero-copy hot paths

- **H2 over TLS hybrid emit** (0.6.2): small responses go through the DRAIN path
  (mem_send + `BIO_write`, no gather allocation); bodies > 2 KiB or streaming go through GATHER
  (NO_COPY refs + a single `SSL_write_ex`). Bench: best-of-three on the h2load matrix.
- **Static small-file fast path** (≤ 64 KiB): the file is slurped into a `zend_string` and sent
  with a single `writev(headers + body)`. Files > 64 KiB go through sendfile.
- **Inline `open`/`fstat`** for static: no futex round trip through the libuv thread pool on a
  warm dentry cache.

## Memory model

The server deliberately minimises RAM footprint:

- **Asymmetric TLS BIO ring sizes** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB, the rest
  unchanged; saves ~62 KiB per TLS connection.
- **Body pool** (see above): reuse of large bodies.
- **Streaming request body**: peak RSS on 50 parallel 20-MiB POSTs drops from 1170 MiB to
  **197 MiB**.
- **Static TSRMLS cache** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` turns `EG()` /
  `ASYNC_G()` into a single `__thread` load instead of `pthread_getspecific`. +32% RPS on a
  minimal HTTP handler.

## RFC compliance

- HTTP/1.1: full RFC 9112 (`Connection: close` → reply mirror per §9.6 since 0.6.3).
- HTTP/2: RFC 9113, rapid-reset mitigation for CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 including connection ID rotation and amplification limits.
- TLS: TLS 1.2/1.3 only, OpenSSL 3.x; HTTP/3 requires OpenSSL 3.5+.
- WebSocket / SSE / gRPC: planned.

## See also

- [TrueAsync ABI](/en/architecture/zend-async-api.html)
- [Scheduler & Reactor](/en/architecture/scheduler-reactor.html)
- [Server configuration](/en/docs/server/configuration.html)
- [Multi-worker](/en/docs/server/workers.html)
