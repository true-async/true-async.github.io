---
layout: docs
lang: es
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /es/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Obtener el estado actual del Circuit Breaker."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Devuelve el estado actual del Circuit Breaker del pool.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

Un valor del enum `CircuitBreakerState`:

- `CircuitBreakerState::ACTIVE` — el pool está funcionando normalmente, los recursos se están entregando.
- `CircuitBreakerState::INACTIVE` — el pool está desactivado, las solicitudes son rechazadas.
- `CircuitBreakerState::RECOVERING` — el pool está en modo de recuperación, permitiendo
  un número limitado de solicitudes para verificar la disponibilidad del servicio.

## Ejemplos

### Ejemplo #1 Verificar el estado del pool

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool está activo\n",
    CircuitBreakerState::INACTIVE => echo "Servicio no disponible\n",
    CircuitBreakerState::RECOVERING => echo "Recuperando...\n",
};
```

### Ejemplo #2 Lógica condicional basada en el estado

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Usar datos en caché en lugar de llamar al servicio
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## Ver también

- [Pool::setCircuitBreakerStrategy](/es/docs/reference/pool/set-circuit-breaker-strategy.html) — Establecer la estrategia
- [Pool::activate](/es/docs/reference/pool/activate.html) — Activación forzada
- [Pool::deactivate](/es/docs/reference/pool/deactivate.html) — Desactivación forzada
- [Pool::recover](/es/docs/reference/pool/recover.html) — Transición al modo de recuperación
