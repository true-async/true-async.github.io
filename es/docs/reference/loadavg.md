---
layout: docs
lang: es
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /es/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg(): load average 1/5/15 minutos. POSIX, en Windows devuelve null."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` devuelve el load average del sistema en los últimos 1, 5 y 15 minutos, o `null`
si la plataforma no admite load average (Windows).

## Descripción

```php
namespace Async;

function loadavg(): ?array
```

El load average es la longitud media de la run-queue del kernel. Es una métrica **distinta** de
la utilización de CPU: en una máquina de 4 núcleos, un load sostenido de 4.0 significa que la
run-queue está, en promedio, totalmente llena.

## Valor de retorno

`array{0: float, 1: float, 2: float}`: `[1min, 5min, 15min]`. En Windows devuelve `null`.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "Load average no disponible en esta plataforma\n";
}
```

### Ejemplo #2 Alerta por sobrecarga

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

        // Load a 5 minutos por encima del número de CPUs disponibles = sobrecarga sostenida.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## Notas

> **Load average ≠ uso de CPU.** Un load alto en una máquina con poco uso de CPU suele
> significar carga IO-bound (procesos en estado `D` sobre disco/red). Para estimar la CPU
> prefiere [`cpu_usage()`](/es/docs/reference/cpu-usage.html).

> **Windows.** En Windows no existe el concepto de load average (es específico de BSD/Linux).
> La función devuelve `null`, de forma intencional, sin emulación.

## Véase también

- [Async\\cpu_usage()](/es/docs/reference/cpu-usage.html): carga actual del proceso y del sistema
- [Async\\available_parallelism()](/es/docs/reference/available-parallelism.html): número de CPUs disponibles
- [Async\\CpuSnapshot](/es/docs/reference/cpu-snapshot.html): contadores de CPU de bajo nivel
