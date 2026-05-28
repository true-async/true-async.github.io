---
layout: docs
lang: fr
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /fr/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — load average 1/5/15 minutes. POSIX, renvoie null sous Windows."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` renvoie le load average système sur les 1, 5 et 15 dernières minutes, ou `null`
si la plateforme ne supporte pas le load average (Windows).

## Description

```php
namespace Async;

function loadavg(): ?array
```

Le load average est la longueur moyenne de la kernel run-queue. C'est une **métrique différente**
de l'utilisation CPU : sur une machine 4 cœurs, un load soutenu de 4.0 signifie que la run-queue
est en moyenne entièrement remplie.

## Valeur de retour

`array{0: float, 1: float, 2: float}` : `[1min, 5min, 15min]`. Sous Windows, renvoie `null`.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Le load average n'est pas disponible sur cette plateforme\n";
}
```

### Exemple #2 Alerte de surcharge

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

        // Un load 5 minutes supérieur au nombre de CPU disponibles = surcharge soutenue.
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

> **Load average ≠ usage CPU.** Un load élevé sur une machine avec un usage CPU faible signifie en
> général une charge I/O-bound (processus en `D`-state sur disque/réseau). Pour évaluer le CPU,
> préférez [`cpu_usage()`](/fr/docs/reference/cpu-usage.html).

> **Windows.** Le concept de load average n'existe pas sous Windows (c'est une spécificité
> BSD/Linux). La fonction renvoie `null` — c'est volontaire, pas d'émulation.

## Voir aussi

- [Async\\cpu_usage()](/fr/docs/reference/cpu-usage.html) — charge actuelle du processus et du système
- [Async\\available_parallelism()](/fr/docs/reference/available-parallelism.html) — nombre de CPU disponibles
- [Async\\CpuSnapshot](/fr/docs/reference/cpu-snapshot.html) — compteurs CPU bas niveau
