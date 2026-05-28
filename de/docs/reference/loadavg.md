---
layout: docs
lang: de
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /de/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — Load Average 1/5/15 min. POSIX, gibt auf Windows null zurück."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` liefert den System Load Average der letzten 1, 5 und 15 Minuten oder `null`,
wenn die Plattform Load Average nicht unterstützt (Windows).

## Beschreibung

```php
namespace Async;

function loadavg(): ?array
```

Load Average ist die durchschnittliche Länge der Kernel-Run-Queue. Das ist eine **andere Metrik** als
CPU-Utilization: auf einer 4-Kern-Maschine bedeutet ein stabiler Load von 4.0, dass die Run-Queue im
Mittel voll besetzt ist.

## Rückgabewert

`array{0: float, 1: float, 2: float}` — `[1min, 5min, 15min]`. Auf Windows wird `null` zurückgegeben.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average ist auf dieser Plattform nicht verfügbar\n";
}
```

### Beispiel #2 Alarm bei Überlast

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

        // 5-min-Load über der Zahl verfügbarer CPUs = anhaltende Überlast.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Hinweise

> **Load Average ≠ CPU Usage.** Ein hoher Load bei leichter CPU-Auslastung bedeutet meist eine
> IO-bound Workload (Prozesse stehen im `D`-State auf Disk/Network). Für CPU-Abschätzung bevorzugen
> Sie [`cpu_usage()`](/de/docs/reference/cpu-usage.html).

> **Windows.** Das Load-Average-Konzept gibt es unter Windows nicht (eine BSD/Linux-Spezialität).
> Die Funktion gibt `null` zurück — das ist bewusst so, ohne Emulation.

## Siehe auch

- [Async\\cpu_usage()](/de/docs/reference/cpu-usage.html) — aktuelle Auslastung von Prozess und System
- [Async\\available_parallelism()](/de/docs/reference/available-parallelism.html) — Anzahl verfügbarer CPUs
- [Async\\CpuSnapshot](/de/docs/reference/cpu-snapshot.html) — Low-Level-CPU-Zähler
