---
layout: docs
lang: de
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /de/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — gibt die Anzahl der CPUs zurück, die dem Prozess zur Verfügung stehen. Berücksichtigt cgroup-Quotas, Affinity und Container-Limits."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` gibt die Anzahl der CPUs zurück, die dem **aktuellen Prozess** zur
Verfügung stehen.

## Beschreibung

```php
namespace Async;

function available_parallelism(): int
```

Berücksichtigt cgroup-CPU-Quotas, `sched_setaffinity` und ähnliche Einschränkungen. Genau diesen
Wert empfiehlt libuv für die Größe von Thread-Pool / Worker-Pool. Stets `>= 1`.

In einem Container mit `cpu.max=2` liefert die Funktion `2`, nicht die physische Kernzahl des Hosts.
Auf Bare-Metal — die Anzahl logischer Kerne abzüglich Affinity-Beschränkungen (sofern gesetzt).

Backend: `uv_available_parallelism()` mit Fallback auf `uv_cpu_info`.

## Rückgabewert

`int` — Anzahl der CPUs, garantiert `>= 1`.

## Beispiele

### Beispiel #1 Pool-Größe an verfügbare CPUs anpassen

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Idiomatisch: Autodetect ist bereits in ThreadPool über workers=0 eingebaut,
// aber der explizite Aufruf ist nötig, wenn man etwas anderes skalieren will.
$pool = new ThreadPool(workers: available_parallelism());
```

### Beispiel #2 Worker-Pool-Größe des HTTP-Servers

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

### Beispiel #3 Umgebungs-Diagnose

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// In Docker mit `--cpus=2` → 2
// Auf einem Host mit 16 Kernen ohne Einschränkungen → 16
// In einem Kubernetes-Pod mit requests/limits cpu=1 → 1
```

## Hinweise

> **Tipp:** Für Worker-Pools von `ThreadPool` und `HttpServer::setWorkers()` muss diese Funktion
> nicht händisch aufgerufen werden — beide Komponenten nutzen `available_parallelism()` automatisch,
> wenn die Pool-Größe auf `0` gesetzt ist.

> Bei den meisten IO-bound Workloads ist es sinnvoll, um `N + 1` oder `N + 2` zu overcommitten — weil
> einige Worker in I/O blockieren.

## Siehe auch

- [Async\\ThreadPool](/de/docs/components/thread-pool.html) — wo der Wert automatisch verwendet wird
- [Async\\cpu_usage()](/de/docs/reference/cpu-usage.html) — aktuelle Auslastung von Prozess und System
- [Async\\loadavg()](/de/docs/reference/loadavg.html) — durchschnittliche Run-Queue-Länge
