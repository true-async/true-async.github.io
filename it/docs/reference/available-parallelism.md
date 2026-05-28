---
layout: docs
lang: it
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /it/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism(): restituisce il numero di CPU disponibili al processo. Tiene conto di quote cgroup, affinity e limiti di container."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` restituisce il numero di CPU disponibili al **processo corrente**.

## Descrizione

```php
namespace Async;

function available_parallelism(): int
```

Tiene conto delle quote CPU di cgroup, di `sched_setaffinity` e di restrizioni analoghe. È il valore
che libuv raccomanda come dimensione di thread pool / worker pool. È sempre `>= 1`.

In un container con `cpu.max=2` la funzione restituisce `2`, non il numero di core fisici dell'host.
Su bare metal: il numero di core logici al netto delle restrizioni di affinity (se impostate).

Backend: `uv_available_parallelism()` con fallback su `uv_cpu_info`.

## Valore restituito

`int`: numero di CPU, garantito `>= 1`.

## Esempi

### Esempio #1 Dimensione del pool in base alle CPU disponibili

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Idiomatico: l'autodetect è già integrato nel ThreadPool con workers=0,
// ma una chiamata esplicita serve quando vuoi scalare qualcos'altro.
$pool = new ThreadPool(workers: available_parallelism());
```

### Esempio #2 Dimensione del worker pool del server HTTP

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

### Esempio #3 Diagnostica dell'ambiente

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// In Docker con `--cpus=2` → 2
// Su host con 16 core senza restrizioni → 16
// In un pod Kubernetes con requests/limits cpu=1 → 1
```

## Note

> **Suggerimento:** per i pool di worker di `ThreadPool` e di `HttpServer::setWorkers()` non serve
> nemmeno chiamare a mano questa funzione: entrambi i componenti usano `available_parallelism()`
> automaticamente quando la dimensione del pool è `0`.

> Per la maggior parte dei carichi IO-bound ha senso fare overcommit a `N + 1` o `N + 2` — alcuni
> worker saranno bloccati in I/O.

## Vedi anche

- [Async\\ThreadPool](/it/docs/components/thread-pool.html) — dove il valore viene usato automaticamente
- [Async\\cpu_usage()](/it/docs/reference/cpu-usage.html) — carico corrente di processo e sistema
- [Async\\loadavg()](/it/docs/reference/loadavg.html) — lunghezza media della run-queue
