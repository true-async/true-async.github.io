---
layout: docs
lang: de
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /de/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — immutabler Snapshot der CPU-Zähler von Prozess und System. Low-Level-Quelle für eigene Delta-Berechnungen."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` — immutabler Point-in-Time-Snapshot der CPU-Zähler von Prozess und System.

## Wann verwenden

Der High-Level-Wrapper [`Async\cpu_usage()`](/de/docs/reference/cpu-usage.html) hält einen internen
Snapshot pro Prozess und berechnet das Delta automatisch. Das genügt für die meisten Telemetrie-Aufgaben.

`CpuSnapshot` brauchen Sie, wenn:

- mehrere unabhängige Telemetrie-Konsumenten ihr eigenes Delta zählen sollen;
- die "rohen" Zähler erhalten bleiben müssen (für Log, Dump, Übergabe an ein anderes System);
- nicht nur Process/System, sondern eigene abgeleitete Metriken berechnet werden sollen.

## Klassenüberblick

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

Alle Zeit-Felder sind monoton wachsende Nanosekunden-Zähler mit implementation-defined Startpunkt.
**Ein einzelner Wert ist bedeutungslos** — bilden Sie das Delta zwischen zwei Snapshots aus
unterschiedlichen Zeitpunkten.

Plattformübergreifend: gleiche Felder und Semantik auf Linux und Windows.

## Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `wallNs` | `int` | Monotone Wall-Clock-Zeit im Moment der Aufnahme. |
| `processUserNs` | `int` | Summierte User-Mode-CPU-Zeit aller Threads des Prozesses. |
| `processSystemNs` | `int` | Summierte Kernel-Mode-CPU-Zeit aller Threads des Prozesses. |
| `systemIdleNs` | `int` | Summierte Idle-Zeit über alle logischen CPUs des Hosts. |
| `systemBusyNs` | `int` | Summierte Non-Idle-Zeit über alle logischen CPUs des Hosts (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Anzahl der logischen CPUs, die das OS im Moment der Aufnahme sieht. |

> **In Containern** spiegeln `systemIdleNs` / `systemBusyNs` den **Host** wider, nicht die cgroup.
> Für Per-Process-Backpressure bevorzugen Sie die `process*`-Felder — sie berücksichtigen Affinity
> und cgroup-CPU-Throttling automatisch.

## Methoden

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Erstellt einen frischen Snapshot.

## Beispiele

### Beispiel #1 Manuelle Delta-Berechnung

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

    // Wie viele Kerne user + kernel time im Intervall belegt haben.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Prozess belegte im Schnitt %.3f Kerne in der letzten Sekunde\n",
        $processCores
    );
});
```

### Beispiel #2 Zwei unabhängige Konsumenten

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

// Zwei Instanzen — zwei unabhängige Messreihen.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Hinweise

> Die Klasse ist **immutabel** und **nicht serialisierbar** (`@strict-properties`, `@not-serializable`).
> Der Konstruktor ist privat — eine Instanz entsteht nur über `CpuSnapshot::now()`.

## Siehe auch

- [Async\\cpu_usage()](/de/docs/reference/cpu-usage.html) — fertiges Delta mit bereits berechneten Prozentwerten
- [Async\\loadavg()](/de/docs/reference/loadavg.html) — Load Average 1/5/15 min
- [Async\\available_parallelism()](/de/docs/reference/available-parallelism.html) — Anzahl verfügbarer CPUs
