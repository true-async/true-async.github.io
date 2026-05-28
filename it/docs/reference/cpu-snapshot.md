---
layout: docs
lang: it
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /it/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot: snapshot immutabile dei contatori CPU di processo e sistema. Sorgente low-level per calcoli di delta personalizzati."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` è uno snapshot point-in-time immutabile dei contatori CPU di processo e sistema.

## Quando usarlo

Il wrapper di alto livello [`Async\cpu_usage()`](/it/docs/reference/cpu-usage.html) tiene un singolo
snapshot interno per processo e calcola la delta automaticamente. È sufficiente per la maggior parte
dei casi di telemetria.

`CpuSnapshot` serve quando:

- più consumatori indipendenti di telemetria vogliono calcolare le proprie delta in modo indipendente;
- bisogna salvare proprio i contatori "grezzi" (per log, dump, trasmissione a un altro sistema);
- si vogliono calcolare non solo metriche process/system ma anche metriche derivate proprie.

## Panoramica della classe

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

Tutti i campi a valore temporale sono contatori in nanosecondi monotonicamente crescenti con origine
implementation-defined. **Un singolo valore non ha significato**: calcola la differenza tra due
snapshot presi in momenti diversi.

Cross-platform: stessi campi e stessa semantica su Linux e Windows.

## Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `wallNs` | `int` | Tempo wall-clock monotono al momento della cattura. |
| `processUserNs` | `int` | Tempo CPU user-mode totale di tutti i thread del processo. |
| `processSystemNs` | `int` | Tempo CPU kernel-mode totale di tutti i thread del processo. |
| `systemIdleNs` | `int` | Tempo idle totale su tutte le CPU logiche dell'host. |
| `systemBusyNs` | `int` | Tempo non-idle totale su tutte le CPU logiche dell'host (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Numero di CPU logiche viste dall'OS al momento della cattura. |

> **Dentro i container** `systemIdleNs` / `systemBusyNs` riflettono l'**host**, non la cgroup. Per
> la contropressione per-processo preferisci i campi `process*`: tengono già conto di affinity e
> throttling CPU della cgroup.

## Metodi

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Cattura uno snapshot fresco.

## Esempi

### Esempio #1 Calcolo manuale della delta

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

    // Quanti core sono stati occupati da user + kernel time nell'intervallo.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Il processo ha occupato in media %.3f core nell'ultimo secondo\n",
        $processCores
    );
});
```

### Esempio #2 Due consumatori indipendenti

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

// Due istanze — due serie di misurazioni indipendenti.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Note

> La classe è **immutabile** e **non serializzabile** (`@strict-properties`, `@not-serializable`).
> Il costruttore è privato — l'istanza si crea solo tramite `CpuSnapshot::now()`.

## Vedi anche

- [Async\\cpu_usage()](/it/docs/reference/cpu-usage.html) — delta pronta con percentuali già calcolate
- [Async\\loadavg()](/it/docs/reference/loadavg.html) — load average a 1/5/15 minuti
- [Async\\available_parallelism()](/it/docs/reference/available-parallelism.html) — numero di CPU disponibili
