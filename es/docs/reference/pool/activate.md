---
layout: docs
lang: es
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /es/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Forzar el pool al estado ACTIVE."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Transiciona forzosamente el pool al estado `ACTIVE`. Los recursos vuelven a estar disponibles
para su adquisición. Se utiliza para la gestión manual del Circuit Breaker, por ejemplo,
después de confirmar que el servicio se ha recuperado.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Activación manual tras verificación

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Supongamos que el pool fue desactivado
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Verificar manualmente la disponibilidad del servicio
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activado\n";
    }
}
```

### Ejemplo #2 Activación por señal externa

```php
<?php

use Async\Pool;

// Manejador de webhook del sistema de monitoreo
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Servicio restaurado, pool activado\n";
}
```

## Ver también

- [Pool::deactivate](/es/docs/reference/pool/deactivate.html) — Transición al estado INACTIVE
- [Pool::recover](/es/docs/reference/pool/recover.html) — Transición al estado RECOVERING
- [Pool::getState](/es/docs/reference/pool/get-state.html) — Estado actual
