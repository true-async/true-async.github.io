---
layout: docs
lang: en
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /en/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker and bootloader"
description: "setWorkers(N): built-in thread pool on Async\\ThreadPool. Bootloader, SO_REUSEPORT, per-request scope, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server runs in **single-threaded** mode by default: one event loop, one thread, the
entire pipeline (accept → parse → dispatch → respond) on a single CPU. This is the fastest model
for typical IO-bound workloads, but it does not scale across cores.

`setWorkers(N)` spins up the built-in pool of N OS threads via
[`Async\ThreadPool`](/en/docs/components/thread-pool.html). Each worker re-binds the same
listeners and the kernel (Linux/BSD) distributes accepts through `SO_REUSEPORT`. Each worker has
its own independent event loop, its own opcache, and its own connection pools.

## Basic example

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid()]);
});

$server->start();   // blocks until all workers finish
```

`HttpServer::start()` in the parent:

1. Spawns an `Async\ThreadPool` of the desired size.
2. Uses `transfer_obj` to copy the config + handler set into each worker.
3. Starts the event loop inside the worker, which re-binds the listeners.
4. The parent `await`s the completion of all workers.

## Graceful shutdown

`HttpServer::stop()` works on a pool parent. It retires the whole cohort and **suspends
until the server is really down** — when it returns, the workers have drained, the pool
is torn down and the listen sockets are closed. Call it from a coroutine; a signal
handler is the usual place:

```php
use function Async\spawn;
use function Async\await;
use function Async\signal;
use Async\Signal;

spawn(function () use ($server) {
    await(signal(Signal::SIGTERM));

    $server->stop();       // returns once the pool is really down
});

$server->start();
```

On a **standalone** server (`setWorkers(1)`, the default) `stop()` does not suspend: it is
normally called from a request handler, and the shutdown drain waits on that very handler —
so a blocking `stop()` there would be waiting for itself.

## Hot reload

`HttpServer::reload()` replaces the worker cohort without dropping a connection: the
workers finish what they are holding, stop and exit, and fresh worker threads re-run the
bootloader — picking up the changed code — and take over on the **same listen sockets**.
It suspends until the old cohort has drained; `start()` keeps running throughout. Pool
parent only.

You rarely call it yourself. Wire a trigger instead:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        require __DIR__ . '/app/bootstrap.php';   // re-runs in every fresh worker
    })

    // development: watch the tree and reload when it settles
    ->enableHotReload([__DIR__ . '/app'], ['php'], debounceMs: 300, maxHoldMs: 2000)

    // production: reload on SIGHUP, which is what a deploy script sends
    ->enableReloadOnSignal();
```

`enableHotReload()` watches each path recursively. A settled burst of changes invalidates
the watched trees in opcache and calls `reload()`. `debounceMs` is the quiet window before
a burst fires one reload; `maxHoldMs` forces a reload at most that long after the first
change, so a directory that never goes quiet still reloads. `enableReloadOnSignal()` arms a
persistent SIGHUP handler (not supported on Windows).

Both are pool-mode only. Whatever the trigger, the code the new workers pick up is whatever
the bootloader loads — so anything you want reloaded must be loaded **there**, not at the
top of the entry script, which runs once in the parent and never again.

> If you call `reload()` by hand, invalidate the changed files first
> (`opcache_invalidate()`) or rely on opcache timestamp validation — otherwise the fresh
> workers compile the old code.

## Bootloader

Heavy worker initialisation (autoload, pool warmup, JIT warmup) must run **once** at start, not
per request. That is what `setBootloader(?\Closure $cb)` is for:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // runs once in each worker before the task loop
        require __DIR__ . '/vendor/autoload.php';

        // warm up the connection pool
        Database::initPool(min: 4, max: 16);

        // pre-compile critical routes
        Router::compile();
    });
```

The closure is deep-copied once and runs on every worker before it starts accepting tasks.
**An exception thrown inside the bootloader fails the entire pool**: the worker does not start.

The bootloader only applies when `setWorkers() > 1`. `null` removes it.

> Requires TrueAsync ABI v0.15+. Test: `server/core/021-bootloader.phpt`.

## Per-request scope

Since 0.6.5, each handler coroutine runs **in its own scope** that is a child of the server scope.
This gives two important semantics:

- [`Async\request_context()`](/en/docs/reference/request-context.html) — a shared context across
  the entire request coroutine tree (the handler and any child `spawn`s).
- [`Async\current_context()`](/en/docs/reference/current-context.html) stays per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // The context is visible to the entire coroutine branch of the request
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\await_all([
        spawn(fn() => fetchUser()),   // request_id is visible here
        spawn(fn() => fetchPosts()),  // and here
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Compare: `current_context()` creates values visible **only** within the current coroutine;
`request_context()` provides a shared subtree tied to the request scope.

The child scope costs two allocations per request. `setRequestScope(false)` drops it and
reuses the connection scope directly — but then `request_context()` returns `null`, so
reach for `?->` if you turn it off.

## SO_REUSEPORT and balancing

On Linux/BSD the kernel distributes incoming connections evenly (but non-deterministically) across
every socket opened with `SO_REUSEPORT` on the same `(host, port)`. Each worker opens its own; no
userspace load balancer is needed, no locks.

On Windows the `SO_REUSEPORT` equivalent is less predictable; lift the balancing one level up
(into an LB) or use single-worker plus N processes on different ports.

## Cross-thread handler transfer

If the configuration is built on one thread and the server runs on another, `HttpServer` supports
the transfer. Since 0.2.0 the transfer path correctly preserves protocol masks (the "silently
dropped every request" bug is fixed; see CHANGELOG and
`core/007-server-transfer-handler-dispatch.phpt`).

## Debugging the multi-threaded mode

Loud logging on an unexpected worker exit was added in 0.6.3. Uncaught `$server->start()`
exceptions and clean returns while the await-loop is still waiting for workers are now visible in
stderr (previously each case silently dropped 1/N of the accept capacity with no operator signal).

Enable INFO logging:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::INFO],
]);
```

> **Do not use `setLogStream()` under a worker pool.** A PHP stream resource opened by the
> parent cannot cross into a worker thread: the sink stays active on the parent and is
> skipped in the workers, with a notice at start-up. Use a sink each worker can open for
> itself — `stderr`, `stdout`, or `file` (each worker reopens the path in append mode).
> See [Observability](/en/docs/server/observability.html).

## How many workers?

Rules of thumb:

- **IO-bound** (standard web with DB/HTTP): start with `available_parallelism()`, watch CPU
  utilisation.
- **CPU-bound** (rendering, compression-heavy, big JSON): `available_parallelism()` or fewer,
  watch p99 latency.
- **Mixed**: overcommit by 1–2 workers (`N+1` or `N+2`) often yields better core utilisation under
  IO stalls.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` returns the number of CPUs available to the process (it takes
> cgroup quotas and affinity into account). Backed by `uv_available_parallelism` with a fallback
> to `uv_cpu_info`.

## See also

- [`HttpServerConfig::setWorkers()`](/en/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/en/docs/reference/server/http-server-config.html#setbootloader)
- [Observability](/en/docs/server/observability.html): cross-worker stats, logging under a pool
- [`Async\ThreadPool`](/en/docs/components/thread-pool.html): pool internals
- [`Async\request_context()`](/en/docs/reference/request-context.html)
- [Backpressure / drain](/en/docs/server/configuration.html#graceful-drain-step-8)
