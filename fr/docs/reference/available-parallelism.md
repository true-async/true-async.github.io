---
layout: docs
lang: fr
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /fr/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — renvoie le nombre de CPU disponibles pour le processus. Prend en compte les quotas cgroup, l'affinity et les limites de conteneurs."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` renvoie le nombre de CPU disponibles pour le **processus courant**.

## Description

```php
namespace Async;

function available_parallelism(): int
```

Prend en compte les quotas CPU cgroup, `sched_setaffinity` et limitations analogues. C'est la
valeur que libuv recommande pour la taille du thread-pool / worker-pool. Toujours `>= 1`.

Dans un conteneur avec `cpu.max=2`, la fonction renvoie `2`, et non le nombre physique de cœurs de
l'hôte. Sur bare-metal, c'est le nombre de cœurs logiques moins les restrictions d'affinity (si
elles sont positionnées).

Backend : `uv_available_parallelism()` avec fallback sur `uv_cpu_info`.

## Valeur de retour

`int` : nombre de CPU, garanti `>= 1`.

## Exemples

### Exemple #1 Taille du pool selon les CPU disponibles

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Idiomatique : l'autodétection est déjà intégrée à ThreadPool via workers=0,
// mais l'appel explicite est utile quand vous voulez dimensionner autre chose.
$pool = new ThreadPool(workers: available_parallelism());
```

### Exemple #2 Taille du worker-pool HTTP

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

### Exemple #3 Diagnostic d'environnement

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// Dans Docker avec `--cpus=2` → 2
// Sur un hôte avec 16 cœurs sans restrictions → 16
// Dans un pod Kubernetes avec requests/limits cpu=1 → 1
```

## Notes

> **Conseil :** pour les worker-pools `ThreadPool` et `HttpServer::setWorkers()`, vous n'avez pas
> du tout besoin d'appeler cette fonction à la main — les deux composants utilisent
> `available_parallelism()` automatiquement lorsque la taille du pool vaut `0`.

> Sur la plupart des charges IO-bound, il est judicieux de faire un overcommit à `N + 1` ou `N + 2`,
> parce qu'une partie des workers sera bloquée en I/O.

## Voir aussi

- [Async\\ThreadPool](/fr/docs/components/thread-pool.html) — où la valeur est utilisée automatiquement
- [Async\\cpu_usage()](/fr/docs/reference/cpu-usage.html) — charge actuelle du processus et du système
- [Async\\loadavg()](/fr/docs/reference/loadavg.html) — longueur moyenne de la run-queue
