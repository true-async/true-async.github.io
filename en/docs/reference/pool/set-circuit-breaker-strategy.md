---
layout: docs
lang: en
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /en/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Set the Circuit Breaker strategy for the pool."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Sets the Circuit Breaker strategy for the pool. The Circuit Breaker monitors
the availability of an external service: upon detecting multiple failures, the pool
automatically transitions to the `INACTIVE` state, preventing a cascade of errors.
When the service recovers, the pool returns to an active state.

## Parameters

**strategy**
: A `CircuitBreakerStrategy` object defining the rules for transitioning
  between states. `null` --- disable Circuit Breaker.

## Return Value

No value is returned.

## Examples

### Example #1 Setting a strategy

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
    failureThreshold: 5,       // after 5 errors — deactivate
    recoveryTimeout: 30000,    // after 30 seconds — attempt recovery
    successThreshold: 3        // 3 successful requests — full activation
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Example #2 Disabling Circuit Breaker

```php
<?php

use Async\Pool;

// Disable the strategy
$pool->setCircuitBreakerStrategy(null);
```

## See Also

- [Pool::getState](/en/docs/reference/pool/get-state.html) --- Current Circuit Breaker state
- [Pool::activate](/en/docs/reference/pool/activate.html) --- Force activation
- [Pool::deactivate](/en/docs/reference/pool/deactivate.html) --- Force deactivation
- [Pool::recover](/en/docs/reference/pool/recover.html) --- Transition to recovery mode
