---
layout: docs
lang: es
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /es/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — obtener una lista de todas las corrutinas activas para diagnóstico."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Devuelve un array de todas las corrutinas activas. Útil para diagnóstico y monitoreo.

## Descripción

```php
get_coroutines(): array
```

## Valores de retorno

Un array de objetos `Async\Coroutine` — todas las corrutinas registradas en la solicitud actual.

## Ejemplos

### Ejemplo #1 Monitoreo de corrutinas

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Dejar que las corrutinas inicien
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Corrutina #%d: %s, creada en %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'suspendida' : 'ejecutándose',
        $coro->getSpawnLocation()
    );
}
?>
```

### Ejemplo #2 Detección de fugas

```php
<?php
use function Async\get_coroutines;

// Al final de una solicitud, verificar corrutinas sin terminar
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Corrutina sin terminar: " . $coro->getSpawnLocation());
    }
}
?>
```

## Ver también

- [current_coroutine()](/es/docs/reference/current-coroutine.html) — corrutina actual
- [Corrutinas](/es/docs/components/coroutines.html) — el concepto de corrutina
