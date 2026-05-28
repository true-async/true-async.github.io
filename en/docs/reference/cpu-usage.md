---
layout: docs
lang: en
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /en/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — current process and system load with automatic delta computation between calls. Convenient for telemetry."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` returns CPU usage since the previous call, with percentages already computed.
Convenient for telemetry loops.

## Description

```php
namespace Async;

function cpu_usage(): array
```

The function keeps a **per-process** internal "previous" snapshot of CPU counters. The first call
stores the snapshot and returns zeros; every subsequent call returns the delta from the previous
snapshot and replaces it.

## Return value

An associative array:

| Key | Type | Description |
|-----|------|-------------|
| `process_cores` | `float` | Average number of cores occupied by the process (`0..cpuCount`). Multi-core factor. |
| `process_percent` | `float` | Share of the total machine capacity, `0..100`. |
| `system_percent` | `float` | Overall host CPU utilisation, `0..100`. |
| `cpu_count` | `int` | Number of logical CPUs visible to the OS. |
| `interval_sec` | `float` | Wall-clock seconds between snapshots. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | 1/5/15-minute load average, or `null` on Windows. |

> Inside containers, `system_percent` reflects the **host**, not the cgroup. For per-process
> backpressure prefer `process_cores` / `process_percent` — they correctly account for affinity
> and cgroup CPU throttling.

## Examples

### Example #1 Logging load once per second

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // The first call "warms up" the internal snapshot and returns zeros.
    cpu_usage();

    while (true) {
        delay(1000);
        $u = cpu_usage();
        printf(
            "[CPU] proc %.2f cores (%.1f%%), system %.1f%%, interval %.3fs\n",
            $u['process_cores'],
            $u['process_percent'],
            $u['system_percent'],
            $u['interval_sec'],
        );
    }
});
```

### Example #2 Process-load-driven backpressure

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Do not accept new work while the process occupies > 90% of its capacity share.
    return $u['process_percent'] < 90.0;
}
```

### Example #3 Health endpoint

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\cpu_usage;
use function Async\loadavg;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/healthz') {
        $u = cpu_usage();
        $res->json([
            'cpu' => $u,
            'load' => loadavg(),
        ]);
        return;
    }
    $res->setStatusCode(404);
});

$server->start();
```

## Notes

> **State is global to the process.** If you need several independent telemetry consumers (for
> example, different subsystems computing their own deltas), take snapshots manually via
> [`CpuSnapshot::now()`](/en/docs/reference/cpu-snapshot.html) and compute deltas yourself.

## See also

- [Async\\CpuSnapshot](/en/docs/reference/cpu-snapshot.html) — low-level CPU counter snapshot
- [Async\\loadavg()](/en/docs/reference/loadavg.html) — 1/5/15-minute load average
- [Async\\available_parallelism()](/en/docs/reference/available-parallelism.html) — number of available CPUs
