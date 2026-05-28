---
layout: docs
lang: es
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /es/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage(): carga actual del proceso y del sistema con cálculo automático del delta entre llamadas. Cómodo para telemetría."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` devuelve la carga de CPU desde la llamada anterior, con los porcentajes ya
calculados. Cómodo para bucles de telemetría.

## Descripción

```php
namespace Async;

function cpu_usage(): array
```

La función mantiene un snapshot interno "anterior" de los contadores de CPU **por proceso**. La
primera llamada guarda el snapshot y devuelve ceros; cada llamada siguiente devuelve el delta
respecto al snapshot anterior y lo sustituye.

## Valor de retorno

Array asociativo:

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `process_cores` | `float` | Número promedio de núcleos ocupados por el proceso (`0..cpuCount`). Factor multi-core. |
| `process_percent` | `float` | Proporción de la capacidad total de la máquina, `0..100`. |
| `system_percent` | `float` | Utilización total de CPU del host, `0..100`. |
| `cpu_count` | `int` | Número de CPUs lógicas vistas por el SO. |
| `interval_sec` | `float` | Segundos wall-clock entre snapshots. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | Load average 1/5/15 min, o `null` en Windows. |

> Dentro de contenedores, `system_percent` refleja el **host**, no el cgroup. Para contrapresión
> per-process prefiere `process_cores` / `process_percent`: tienen en cuenta correctamente la
> affinity y el throttling de CPU del cgroup.

## Ejemplos

### Ejemplo #1 Logging de la carga cada segundo

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // La primera llamada "calienta" el snapshot interno y devuelve ceros.
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

### Ejemplo #2 Contrapresión basada en la carga del proceso

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // No aceptar más trabajo mientras el proceso ocupe > 90% de su cuota de capacidad.
    return $u['process_percent'] < 90.0;
}
```

### Ejemplo #3 Health endpoint

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

## Notas

> **El estado es global del proceso.** Si necesitas varios consumidores independientes de
> telemetría (por ejemplo, distintos subsistemas que cuentan su propio delta), toma los snapshots
> a mano con [`CpuSnapshot::now()`](/es/docs/reference/cpu-snapshot.html) y calcula el delta por
> tu cuenta.

## Véase también

- [Async\\CpuSnapshot](/es/docs/reference/cpu-snapshot.html): snapshot de bajo nivel de los contadores de CPU
- [Async\\loadavg()](/es/docs/reference/loadavg.html): load average 1/5/15 minutos
- [Async\\available_parallelism()](/es/docs/reference/available-parallelism.html): número de CPUs disponibles
