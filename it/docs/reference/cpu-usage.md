---
layout: docs
lang: it
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /it/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage(): carico corrente di processo e sistema con calcolo automatico della differenza tra una chiamata e l'altra. Comodo per la telemetria."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` restituisce il carico CPU dall'ultima chiamata, con percentuali già calcolate.
Comodo per i cicli di telemetria.

## Descrizione

```php
namespace Async;

function cpu_usage(): array
```

La funzione tiene uno snapshot "precedente" interno **per processo** dei contatori CPU. La prima
chiamata salva lo snapshot e restituisce zero; ogni chiamata successiva restituisce la differenza
rispetto allo snapshot precedente e lo sostituisce.

## Valore restituito

Array associativo:

| Chiave | Tipo | Descrizione |
|--------|------|-------------|
| `process_cores` | `float` | Numero medio di core occupati dal processo (`0..cpuCount`). Fattore multi-core. |
| `process_percent` | `float` | Percentuale della capacità totale della macchina, `0..100`. |
| `system_percent` | `float` | Utilizzo CPU totale dell'host, `0..100`. |
| `cpu_count` | `int` | Numero di CPU logiche viste dall'OS. |
| `interval_sec` | `float` | Secondi wall-clock tra gli snapshot. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load average a 1/5/15 minuti oppure `null` su Windows. |

> Dentro i container `system_percent` riflette l'**host**, non la cgroup. Per la contropressione
> per-processo preferisci `process_cores` / `process_percent`: tengono correttamente conto di
> affinity e del throttling CPU della cgroup.

## Esempi

### Esempio #1 Logging del carico una volta al secondo

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // La prima chiamata "riscalda" lo snapshot interno e restituisce zero.
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

### Esempio #2 Contropressione basata sul carico del processo

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Non accettare nuovi task finché il processo occupa più del 90% della propria capacità.
    return $u['process_percent'] < 90.0;
}
```

### Esempio #3 Endpoint di health

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

## Note

> **Lo stato è globale al processo.** Se servono più consumatori indipendenti di telemetria (ad
> esempio sottosistemi diversi che calcolano la propria delta), prendi gli snapshot a mano con
> [`CpuSnapshot::now()`](/it/docs/reference/cpu-snapshot.html) e calcola la differenza autonomamente.

## Vedi anche

- [Async\\CpuSnapshot](/it/docs/reference/cpu-snapshot.html) — snapshot low-level dei contatori CPU
- [Async\\loadavg()](/it/docs/reference/loadavg.html) — load average a 1/5/15 minuti
- [Async\\available_parallelism()](/it/docs/reference/available-parallelism.html) — numero di CPU disponibili
