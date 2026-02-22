---
layout: docs
lang: es
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /es/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Transicionar el pool al estado RECOVERING."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Transiciona el pool al estado `RECOVERING`. En este estado, el pool permite
que un número limitado de solicitudes pasen para verificar la disponibilidad del servicio.
Si las solicitudes tienen éxito, el Circuit Breaker transiciona automáticamente
el pool al estado `ACTIVE`. Si las solicitudes siguen fallando,
el pool vuelve a `INACTIVE`.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Intento de recuperación

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// El pool está desactivado, intentar recuperar
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transicionado al modo de recuperación\n";
    // El Circuit Breaker permitirá que pasen solicitudes de prueba
}
```

### Ejemplo #2 Intentos periódicos de recuperación

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // verificar cada 10 segundos
    }
});
```

## Ver también

- [Pool::activate](/es/docs/reference/pool/activate.html) — Activación forzada
- [Pool::deactivate](/es/docs/reference/pool/deactivate.html) — Desactivación forzada
- [Pool::getState](/es/docs/reference/pool/get-state.html) — Estado actual
- [Pool::setCircuitBreakerStrategy](/es/docs/reference/pool/set-circuit-breaker-strategy.html) — Configurar la estrategia
