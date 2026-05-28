---
layout: docs
lang: de
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /de/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — aktuelle Auslastung von Prozess und System mit automatischer Delta-Berechnung zwischen Aufrufen. Bequem für Telemetrie."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` liefert die CPU-Auslastung seit dem letzten Aufruf, mit bereits berechneten
Prozentwerten. Praktisch für Telemetrie-Loops.

## Beschreibung

```php
namespace Async;

function cpu_usage(): array
```

Die Funktion hält einen **prozessinternen** "vorherigen" Snapshot der CPU-Zähler. Der erste Aufruf
speichert den Snapshot und gibt Nullen zurück; jeder folgende Aufruf liefert das Delta zum vorherigen
Snapshot und ersetzt diesen.

## Rückgabewert

Assoziatives Array:

| Schlüssel | Typ | Beschreibung |
|-----------|-----|--------------|
| `process_cores` | `float` | Gemittelte Anzahl belegter Kerne durch den Prozess (`0..cpuCount`). Multi-Core-Faktor. |
| `process_percent` | `float` | Anteil an der Gesamtmaschinen-Capacity, `0..100`. |
| `system_percent` | `float` | Gesamt-CPU-Auslastung des Hosts, `0..100`. |
| `cpu_count` | `int` | Anzahl der logischen CPUs, die das OS sieht. |
| `interval_sec` | `float` | Wall-Clock-Sekunden zwischen den Snapshots. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load Average 1/5/15 min oder `null` auf Windows. |

> In Containern spiegelt `system_percent` den **Host** wider, nicht die cgroup. Für Per-Process-Backpressure
> bevorzugen Sie `process_cores` / `process_percent` — sie berücksichtigen Affinity und cgroup-CPU-Throttling
> korrekt.

## Beispiele

### Beispiel #1 Auslastung sekündlich loggen

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // Der erste Aufruf "wärmt" den internen Snapshot und gibt Nullen zurück.
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

### Beispiel #2 Backpressure auf Basis der Prozessauslastung

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Keine neuen Tasks annehmen, solange der Prozess > 90 % seines Capacity-Anteils belegt.
    return $u['process_percent'] < 90.0;
}
```

### Beispiel #3 Health-Endpoint

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

## Hinweise

> **State ist prozessglobal.** Wenn Sie mehrere unabhängige Telemetrie-Konsumenten brauchen
> (z. B. verschiedene Subsysteme, die je ihr eigenes Delta zählen), nehmen Sie Snapshots manuell
> über [`CpuSnapshot::now()`](/de/docs/reference/cpu-snapshot.html) und berechnen das Delta selbst.

## Siehe auch

- [Async\\CpuSnapshot](/de/docs/reference/cpu-snapshot.html) — low-level Snapshot der CPU-Zähler
- [Async\\loadavg()](/de/docs/reference/loadavg.html) — Load Average 1/5/15 min
- [Async\\available_parallelism()](/de/docs/reference/available-parallelism.html) — Anzahl verfügbarer CPUs
