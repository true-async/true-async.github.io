---
layout: docs
lang: en
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /en/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — immutable snapshot of process and system CPU counters. Low-level source for custom delta calculations."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` is an immutable point-in-time snapshot of process and system CPU counters.

## When to use it

The high-level wrapper [`Async\cpu_usage()`](/en/docs/reference/cpu-usage.html) keeps a single
internal snapshot per process and computes the delta automatically. That is enough for most
telemetry tasks.

`CpuSnapshot` is needed when:

- multiple independent telemetry consumers want to compute their own deltas independently;
- you need to keep the raw counters (for a log, dump, or transfer to another system);
- you want to compute derived metrics beyond process/system.

## Class overview

```php
namespace Async;

final class CpuSnapshot
{
    public readonly int $wallNs;
    public readonly int $processUserNs;
    public readonly int $processSystemNs;
    public readonly int $systemIdleNs;
    public readonly int $systemBusyNs;
    public readonly int $cpuCount;

    public static function now(): CpuSnapshot;
}
```

All time-valued fields are monotonically increasing nanosecond counters with an
implementation-defined origin. **A single value carries no meaning by itself** — compute deltas
between two snapshots taken at different times.

Cross-platform: identical fields and semantics on Linux and Windows.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `wallNs` | `int` | Monotonic wall-clock time at capture. |
| `processUserNs` | `int` | Aggregate user-mode CPU time across all process threads. |
| `processSystemNs` | `int` | Aggregate kernel-mode CPU time across all process threads. |
| `systemIdleNs` | `int` | Aggregate idle time across all logical CPUs on the host. |
| `systemBusyNs` | `int` | Aggregate non-idle time across all logical CPUs on the host (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Number of logical CPUs visible to the OS at capture. |

> **Inside containers** `systemIdleNs` / `systemBusyNs` reflect the **host**, not the cgroup. For
> per-process backpressure prefer `process*` fields — they automatically honour affinity and
> cgroup CPU throttling.

## Methods

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Takes a fresh snapshot.

## Examples

### Example #1 Manual delta computation

```php
<?php
use Async\CpuSnapshot;
use function Async\spawn;
use function Async\delay;

spawn(function () {
    $prev = CpuSnapshot::now();
    delay(1000);
    $now = CpuSnapshot::now();

    $wall = $now->wallNs  - $prev->wallNs;
    $user = $now->processUserNs   - $prev->processUserNs;
    $sys  = $now->processSystemNs - $prev->processSystemNs;

    // How many cores user + kernel time occupied over the interval.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Process used on average %.3f cores over the last second\n",
        $processCores
    );
});
```

### Example #2 Two independent consumers

```php
<?php
use Async\CpuSnapshot;

class TelemetryReporter
{
    private ?CpuSnapshot $prev = null;

    public function tick(): array
    {
        $now = CpuSnapshot::now();
        if ($this->prev === null) {
            $this->prev = $now;
            return ['process_cores' => 0.0];
        }

        $wall = $now->wallNs - $this->prev->wallNs;
        $cpu  = ($now->processUserNs   - $this->prev->processUserNs)
              + ($now->processSystemNs - $this->prev->processSystemNs);

        $this->prev = $now;
        return ['process_cores' => $wall > 0 ? $cpu / $wall : 0.0];
    }
}

// Two instances — two independent measurement series.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Notes

> The class is **immutable** and **not serializable** (`@strict-properties`,
> `@not-serializable`). The constructor is private — instances are created only via
> `CpuSnapshot::now()`.

## See also

- [Async\\cpu_usage()](/en/docs/reference/cpu-usage.html) — ready-made delta with percentages
- [Async\\loadavg()](/en/docs/reference/loadavg.html) — 1/5/15-minute load average
- [Async\\available_parallelism()](/en/docs/reference/available-parallelism.html) — number of available CPUs
