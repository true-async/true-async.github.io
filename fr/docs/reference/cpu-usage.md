---
layout: docs
lang: fr
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /fr/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — charge actuelle du processus et du système avec calcul automatique du delta entre les appels. Pratique pour la télémétrie."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` renvoie la charge CPU depuis le précédent appel, avec les pourcentages déjà
calculés. Pratique pour les boucles de télémétrie.

## Description

```php
namespace Async;

function cpu_usage(): array
```

La fonction conserve un snapshot « précédent » des compteurs CPU **par processus**. Le premier
appel sauvegarde le snapshot et retourne des zéros ; chaque appel suivant renvoie le delta par
rapport au snapshot précédent et le remplace.

## Valeur de retour

Tableau associatif :

| Clé | Type | Description |
|-----|------|-------------|
| `process_cores` | `float` | Nombre moyen de cœurs occupés par le processus (`0..cpuCount`). Facteur multi-cœur. |
| `process_percent` | `float` | Part de la capacité machine totale, `0..100`. |
| `system_percent` | `float` | Utilisation CPU globale de l'hôte, `0..100`. |
| `cpu_count` | `int` | Nombre de CPU logiques vus par l'OS. |
| `interval_sec` | `float` | Secondes wall-clock entre les snapshots. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load average 1/5/15 min ou `null` sous Windows. |

> Dans les conteneurs, `system_percent` reflète **l'hôte**, pas la cgroup. Pour un backpressure
> per-process, préférez `process_cores` / `process_percent` — ils prennent correctement en compte
> l'affinity et le throttling CPU cgroup.

## Exemples

### Exemple #1 Logging de la charge une fois par seconde

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // Le premier appel « préchauffe » le snapshot interne et renvoie des zéros.
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

### Exemple #2 Backpressure basé sur la charge du processus

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // Ne pas accepter de nouveaux travaux tant que le processus occupe > 90 % de sa part de capacité.
    return $u['process_percent'] < 90.0;
}
```

### Exemple #3 Health endpoint

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

## Notes

> **L'état est global au processus.** Si vous avez besoin de plusieurs consommateurs de télémétrie
> indépendants (par exemple, différents sous-systèmes calculant chacun leur delta), prenez les
> snapshots à la main via [`CpuSnapshot::now()`](/fr/docs/reference/cpu-snapshot.html) et
> calculez le delta vous-même.

## Voir aussi

- [Async\\CpuSnapshot](/fr/docs/reference/cpu-snapshot.html) — snapshot bas niveau des compteurs CPU
- [Async\\loadavg()](/fr/docs/reference/loadavg.html) — load average 1/5/15 minutes
- [Async\\available_parallelism()](/fr/docs/reference/available-parallelism.html) — nombre de CPU disponibles
