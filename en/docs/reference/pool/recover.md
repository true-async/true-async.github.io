---
layout: docs
lang: en
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /en/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Transition the pool to the RECOVERING state."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Transitions the pool to the `RECOVERING` state. In this state, the pool allows
a limited number of requests through to check service availability.
If requests succeed, the Circuit Breaker automatically transitions
the pool to the `ACTIVE` state. If requests continue to fail,
the pool returns to `INACTIVE`.

## Parameters

This method takes no parameters.

## Return Value

No value is returned.

## Examples

### Example #1 Recovery attempt

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Pool is deactivated, try to recover
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // Circuit Breaker will allow probe requests through
}
```

### Example #2 Periodic recovery attempts

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // check every 10 seconds
    }
});
```

## See Also

- [Pool::activate](/en/docs/reference/pool/activate.html) --- Force activation
- [Pool::deactivate](/en/docs/reference/pool/deactivate.html) --- Force deactivation
- [Pool::getState](/en/docs/reference/pool/get-state.html) --- Current state
- [Pool::setCircuitBreakerStrategy](/en/docs/reference/pool/set-circuit-breaker-strategy.html) --- Configure strategy
