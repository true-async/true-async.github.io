---
layout: docs
lang: es
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /es/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Forzar el pool al estado INACTIVE."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Transiciona forzosamente el pool al estado `INACTIVE`. En este estado,
el pool rechaza todas las solicitudes de adquisición de recursos. Se utiliza para
la desactivación manual cuando se detectan problemas con un servicio externo.

A diferencia de `close()`, la desactivación es reversible — el pool puede volver
a un estado funcional mediante `activate()` o `recover()`.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Desactivación al detectar un problema

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Al detectar un error crítico
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Servicio no disponible, pool desactivado\n";
}
```

### Ejemplo #2 Mantenimiento planificado

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool desactivado para mantenimiento\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Mantenimiento completado, pool activado\n";
}
```

## Ver también

- [Pool::activate](/es/docs/reference/pool/activate.html) — Transición al estado ACTIVE
- [Pool::recover](/es/docs/reference/pool/recover.html) — Transición al estado RECOVERING
- [Pool::getState](/es/docs/reference/pool/get-state.html) — Estado actual
- [Pool::close](/es/docs/reference/pool/close.html) — Cierre permanente del pool (irreversible)
