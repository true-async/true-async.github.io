---
layout: docs
lang: es
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /es/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot: snapshot inmutable de contadores de CPU del proceso y del sistema. Fuente de bajo nivel para tus propios cálculos de delta."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` es un snapshot inmutable point-in-time de los contadores de CPU del proceso
y del sistema.

## Cuándo usarlo

El wrapper de alto nivel [`Async\cpu_usage()`](/es/docs/reference/cpu-usage.html) mantiene un
único snapshot interno por proceso y calcula el delta de forma automática. Para la mayoría de
tareas de telemetría es suficiente.

`CpuSnapshot` hace falta cuando:

- varios consumidores independientes de telemetría quieren calcular sus deltas por separado;
- hay que conservar los contadores "en crudo" (para log, dump, transferencia a otro sistema);
- se quieren derivar métricas propias, además de process/system.

## Visión de la clase

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

Todos los campos con valor temporal son contadores en nanosegundos monótonamente crecientes con
un origen implementation-defined. **Un valor aislado no tiene sentido**: calcula el delta entre
dos snapshots tomados en momentos distintos.

Multiplataforma: los mismos campos y semántica en Linux y Windows.

## Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `wallNs` | `int` | Tiempo wall-clock monótono en el momento del snapshot. |
| `processUserNs` | `int` | Tiempo de CPU user-mode total de todos los hilos del proceso. |
| `processSystemNs` | `int` | Tiempo de CPU kernel-mode total de todos los hilos del proceso. |
| `systemIdleNs` | `int` | Tiempo idle total sobre todas las CPUs lógicas del host. |
| `systemBusyNs` | `int` | Tiempo non-idle total sobre todas las CPUs lógicas del host (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | Número de CPUs lógicas vistas por el SO en el momento del snapshot. |

> **Dentro de contenedores**, `systemIdleNs` / `systemBusyNs` reflejan el **host**, no el
> cgroup. Para contrapresión per-process prefiere los campos `process*`: tienen en cuenta
> automáticamente la affinity y el throttling de CPU del cgroup.

## Métodos

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

Toma un snapshot fresco.

## Ejemplos

### Ejemplo #1 Cálculo manual del delta

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

    // Cuántos núcleos ocupó el tiempo user + kernel durante el intervalo.
    $processCores = ($user + $sys) / $wall;

    printf(
        "El proceso ocupó de media %.3f núcleos durante el último segundo\n",
        $processCores
    );
});
```

### Ejemplo #2 Dos consumidores independientes

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

// Dos instancias, dos series de mediciones independientes.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## Notas

> La clase es **inmutable** y **no serializable** (`@strict-properties`, `@not-serializable`).
> El constructor es privado; la instancia se crea solo mediante `CpuSnapshot::now()`.

## Véase también

- [Async\\cpu_usage()](/es/docs/reference/cpu-usage.html): delta listo con porcentajes ya calculados
- [Async\\loadavg()](/es/docs/reference/loadavg.html): load average 1/5/15 minutos
- [Async\\available_parallelism()](/es/docs/reference/available-parallelism.html): número de CPUs disponibles
