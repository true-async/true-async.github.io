---
layout: docs
lang: es
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /es/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Establecer la estrategia del Circuit Breaker para el pool."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Establece la estrategia del Circuit Breaker para el pool. El Circuit Breaker monitorea
la disponibilidad de un servicio externo: al detectar múltiples fallos, el pool
transiciona automáticamente al estado `INACTIVE`, evitando una cascada de errores.
Cuando el servicio se recupera, el pool vuelve al estado activo.

## Parámetros

**strategy**
: Un objeto `CircuitBreakerStrategy` que define las reglas para la transición
  entre estados. `null` — desactivar el Circuit Breaker.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Establecer una estrategia

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // después de 5 errores — desactivar
    recoveryTimeout: 30000,    // después de 30 segundos — intentar recuperación
    successThreshold: 3        // 3 solicitudes exitosas — activación completa
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Ejemplo #2 Desactivar el Circuit Breaker

```php
<?php

use Async\Pool;

// Desactivar la estrategia
$pool->setCircuitBreakerStrategy(null);
```

## Ver también

- [Pool::getState](/es/docs/reference/pool/get-state.html) — Estado actual del Circuit Breaker
- [Pool::activate](/es/docs/reference/pool/activate.html) — Activación forzada
- [Pool::deactivate](/es/docs/reference/pool/deactivate.html) — Desactivación forzada
- [Pool::recover](/es/docs/reference/pool/recover.html) — Transición al modo de recuperación
