---
layout: docs
lang: en
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /en/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — returns the number of CPUs available to the process. Honours cgroup quotas, affinity, and container limits."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` returns the number of CPUs available to the **current process**.

## Description

```php
namespace Async;

function available_parallelism(): int
```

Honours cgroup CPU quotas, `sched_setaffinity`, and similar constraints. This is the value libuv
recommends for thread-pool / worker-pool sizing. Always `>= 1`.

In a container with `cpu.max=2`, the function returns `2`, not the physical core count of the
host. On bare metal — the number of logical cores minus affinity restrictions (if any).

Backend: `uv_available_parallelism()` with a fallback to `uv_cpu_info`.

## Return value

`int` — number of CPUs, guaranteed `>= 1`.

## Examples

### Example #1 Pool size matching available CPUs

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Idiomatic: the autodetect is already built into ThreadPool via workers=0,
// but the explicit call is useful when you scale something else.
$pool = new ThreadPool(workers: available_parallelism());
```

### Example #2 HTTP server worker-pool size

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\available_parallelism;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(available_parallelism())
);

$server->start();
```

### Example #3 Environment diagnostics

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// In Docker with `--cpus=2` → 2
// On a host with 16 cores and no limits → 16
// In a Kubernetes pod with requests/limits cpu=1 → 1
```

## Notes

> **Tip:** for `ThreadPool` and `HttpServer::setWorkers()` you do not have to call this function
> by hand at all — both components use `available_parallelism()` automatically when the pool size
> is set to `0`.

> On most IO-bound workloads it makes sense to overcommit by `N + 1` or `N + 2`, because some
> workers will be blocked on I/O.

## See also

- [Async\\ThreadPool](/en/docs/components/thread-pool.html) — where the value is used automatically
- [Async\\cpu_usage()](/en/docs/reference/cpu-usage.html) — current process and system load
- [Async\\loadavg()](/en/docs/reference/loadavg.html) — average run-queue length
