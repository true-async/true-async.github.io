---
layout: docs
lang: it
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /it/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg(): load average a 1/5/15 minuti. POSIX, su Windows restituisce null."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` restituisce il load average del sistema nell'ultimo minuto, negli ultimi 5 e negli
ultimi 15 minuti, oppure `null` se la piattaforma non supporta il load average (Windows).

## Descrizione

```php
namespace Async;

function loadavg(): ?array
```

Il load average è la lunghezza media della run-queue del kernel. È una **metrica diversa** dalla
CPU utilization: su una macchina a 4 core un load sostenuto di 4.0 significa che la run-queue è in
media piena.

## Valore restituito

`array{0: float, 1: float, 2: float}`: `[1min, 5min, 15min]`. Su Windows restituisce `null`.

## Esempi

### Esempio #1 Uso di base

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average non disponibile su questa piattaforma\n";
}
```

### Esempio #2 Avviso di sovraccarico

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

        // Load a 5 minuti superiore al numero di CPU disponibili = sovraccarico sostenuto.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Note

> **Load average ≠ utilizzo CPU.** Un load alto su una macchina con CPU usage leggero indica di
> solito un carico IO-bound (processi in stato `D` su disco/rete). Per stimare la CPU preferisci
> [`cpu_usage()`](/it/docs/reference/cpu-usage.html).

> **Windows.** Il concetto di load average in Windows non esiste (è specifico di BSD/Linux). La
> funzione restituisce `null`: è voluto, senza emulazioni.

## Vedi anche

- [Async\\cpu_usage()](/it/docs/reference/cpu-usage.html) — carico corrente di processo e sistema
- [Async\\available_parallelism()](/it/docs/reference/available-parallelism.html) — numero di CPU disponibili
- [Async\\CpuSnapshot](/it/docs/reference/cpu-snapshot.html) — contatori CPU low-level
