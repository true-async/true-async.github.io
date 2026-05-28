---
layout: docs
lang: en
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /en/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — 1/5/15-minute load average. POSIX; returns null on Windows."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` returns the system load average over the last 1, 5, and 15 minutes, or `null`
if the platform does not support load average (Windows).

## Description

```php
namespace Async;

function loadavg(): ?array
```

Load average is the average length of the kernel run queue. It is a **different metric** from
CPU utilisation: on a 4-core machine a steady load of 4.0 means the run queue is, on average,
fully populated.

## Return value

`array{0: float, 1: float, 2: float}` — `[1min, 5min, 15min]`. On Windows the function returns
`null`.

## Examples

### Example #1 Basic usage

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average is not available on this platform\n";
}
```

### Example #2 Overload alert

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\loadavg;
use function Async\available_parallelism;

spawn(function () {
    $cpu = available_parallelism();
    while (true) {
        delay(60_000);
        $load = loadavg();
        if ($load === null) continue;

        // 5-minute load above the number of available CPUs = sustained overload.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Notes

> **Load average ≠ CPU usage.** A high load on a machine with light CPU usage usually means an
> I/O-bound workload (processes stuck in `D`-state on disk/network). For CPU assessment prefer
> [`cpu_usage()`](/en/docs/reference/cpu-usage.html).

> **Windows.** There is no load-average concept in Windows (it is a BSD/Linux thing). The function
> returns `null` — intentionally, with no emulation.

## See also

- [Async\\cpu_usage()](/en/docs/reference/cpu-usage.html) — current process and system load
- [Async\\available_parallelism()](/en/docs/reference/available-parallelism.html) — number of available CPUs
- [Async\\CpuSnapshot](/en/docs/reference/cpu-snapshot.html) — low-level CPU counters
