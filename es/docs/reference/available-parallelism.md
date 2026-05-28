---
layout: docs
lang: es
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /es/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism(): devuelve el número de CPUs disponibles para el proceso. Tiene en cuenta cuotas de cgroup, affinity y límites de contenedor."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` devuelve el número de CPUs disponibles para el **proceso actual**.

## Descripción

```php
namespace Async;

function available_parallelism(): int
```

Tiene en cuenta cuotas CPU de cgroup, `sched_setaffinity` y restricciones similares. Es el valor
que libuv recomienda como tamaño de thread-pool / worker-pool. Siempre `>= 1`.

En un contenedor con `cpu.max=2` la función devuelve `2`, no el número físico de núcleos del
host. En bare-metal, el número de núcleos lógicos menos las restricciones de affinity (si están
fijadas).

Backend: `uv_available_parallelism()` con fallback a `uv_cpu_info`.

## Valor de retorno

`int`: número de CPUs, garantizado `>= 1`.

## Ejemplos

### Ejemplo #1 Tamaño del pool según las CPUs disponibles

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// Idiomático: la autodetección ya está integrada en ThreadPool mediante workers=0;
// la llamada explícita hace falta cuando quieres escalar otra cosa.
$pool = new ThreadPool(workers: available_parallelism());
```

### Ejemplo #2 Tamaño del worker-pool del servidor HTTP

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

### Ejemplo #3 Diagnóstico de entorno

```php
<?php
use function Async\available_parallelism;

echo "El proceso puede usar ", available_parallelism(), " CPU(s)\n";

// En Docker con `--cpus=2` → 2
// En un host de 16 núcleos sin restricciones → 16
// En un pod de Kubernetes con requests/limits cpu=1 → 1
```

## Notas

> **Consejo:** para los pools de workers de `ThreadPool` y `HttpServer::setWorkers()` ni siquiera
> hace falta llamar a esta función a mano; ambos componentes usan `available_parallelism()`
> automáticamente si el tamaño del pool se indica como `0`.

> En la mayoría de cargas IO-bound tiene sentido sobre-suscribir en `N + 1` o `N + 2`, porque
> algunos workers se quedarán bloqueados en E/S.

## Véase también

- [Async\\ThreadPool](/es/docs/components/thread-pool.html): donde el valor se usa automáticamente
- [Async\\cpu_usage()](/es/docs/reference/cpu-usage.html): carga actual del proceso y del sistema
- [Async\\loadavg()](/es/docs/reference/loadavg.html): longitud media de la run-queue
