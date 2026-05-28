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
    $res->json(['pid' => getmypid(), 'tid' => /* TID */]);
});

$server->start();   // blocks until all workers finish
```

`HttpServer::start()` in the parent:

1. Spawns an `Async\ThreadPool` of the desired size.
2. Uses `transfer_obj` to copy the config + handler set into each worker.
3. Starts the event loop inside the worker, which re-binds the listeners.
4. The parent `await`s the completion of all workers.

Cross-thread `stop()` is still on the roadmap; shutdown today works through SIGINT/SIGTERM or
natural drain.

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
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // request_id is visible here
        spawn(fn() => fetchPosts()),  // and here
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Compare: `current_context()` creates values visible **only** within the current coroutine;
`request_context()` provides a shared subtree tied to the request scope.

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
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

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
- [`Async\ThreadPool`](/en/docs/components/thread-pool.html): pool internals
- [`Async\request_context()`](/en/docs/reference/request-context.html)
- [Backpressure / drain](/en/docs/server/configuration.html#graceful-drain-step-8)
