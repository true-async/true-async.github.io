---
layout: docs
lang: fr
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /fr/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — snapshot immuable des compteurs CPU du processus et du système. Source bas niveau pour vos propres calculs de delta."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` est un snapshot point-in-time immuable des compteurs CPU du processus et du
système.

## Quand l'utiliser

Le wrapper haut niveau [`Async\cpu_usage()`](/fr/docs/reference/cpu-usage.html) maintient un
unique snapshot interne par processus et calcule le delta automatiquement. Cela suffit pour la
plupart des tâches de télémétrie.

`CpuSnapshot` est utile quand :

- plusieurs consommateurs de télémétrie indépendants veulent calculer leurs deltas séparément ;
- vous voulez conserver précisément les compteurs « bruts » (pour un log, un dump, le passage à
  un autre système) ;
- vous voulez calculer non seulement process/system mais aussi vos propres métriques dérivées.

## Aperçu de la classe

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

Tous les champs time-valued sont des compteurs nanosecondes monotonement croissants avec une
origine implementation-defined. **Une valeur isolée n'a pas de sens** — calculez le delta entre
deux snapshots pris à des moments différents.

Cross-plateforme : champs et sémantique identiques sous Linux et Windows.

## Champs

| Champ | Type | Description |
|-------|------|-------------|
| `wallNs` | `int` | Wall-clock monotone au moment du capture. |
| `processUserNs` | `int` | Temps CPU user-mode total de tous les threads du processus. |
| `processSystemNs` | `int` | Temps CPU kernel-mode total de tous les threads du processus. |
| `systemIdleNs` | `int` | Temps idle total sur tous les CPU logiques de l'hôte. |
| `systemBusyNs` | `int` | Temps non-idle total sur tous les CPU logiques de l'hôte (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Nombre de CPU logiques vus par l'OS au moment du capture. |

> **Dans les conteneurs**, `systemIdleNs` / `systemBusyNs` reflètent **l'hôte**, pas la cgroup.
> Pour un backpressure per-process, préférez les champs `process*` — ils tiennent automatiquement
> compte de l'affinity et du throttling CPU cgroup.

## Méthodes

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Prend un snapshot frais.

## Exemples

### Exemple #1 Calcul manuel du delta

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

    // Combien de cœurs ont été occupés par user + kernel sur l'intervalle.
    $processCores = ($user + $sys) / $wall;

    printf(
        "Le processus a occupé en moyenne %.3f cœur sur la dernière seconde\n",
        $processCores
    );
});
```

### Exemple #2 Deux consommateurs indépendants

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

// Deux instances → deux séries de mesures indépendantes.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Notes

> La classe est **immuable** et **non sérialisable** (`@strict-properties`, `@not-serializable`).
> Le constructeur est privé — une instance n'est créée que par `CpuSnapshot::now()`.

## Voir aussi

- [Async\\cpu_usage()](/fr/docs/reference/cpu-usage.html) — delta prêt à l'emploi avec pourcentages calculés
- [Async\\loadavg()](/fr/docs/reference/loadavg.html) — load average 1/5/15 minutes
- [Async\\available_parallelism()](/fr/docs/reference/available-parallelism.html) — nombre de CPU disponibles
