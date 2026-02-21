---
layout: docs
lang: en
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /en/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Get the current Circuit Breaker state."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Returns the current Circuit Breaker state of the pool.

## Parameters

This method takes no parameters.

## Return Value

A `CircuitBreakerState` enum value:

- `CircuitBreakerState::ACTIVE` --- the pool is operating normally, resources are being issued.
- `CircuitBreakerState::INACTIVE` --- the pool is deactivated, requests are rejected.
- `CircuitBreakerState::RECOVERING` --- the pool is in recovery mode, allowing
  a limited number of requests to check service availability.

## Examples

### Example #1 Checking pool state

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
    CircuitBreakerState::ACTIVE => echo "Pool is active\n",
    CircuitBreakerState::INACTIVE => echo "Service unavailable\n",
    CircuitBreakerState::RECOVERING => echo "Recovering...\n",
};
```

### Example #2 Conditional logic based on state

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Use cached data instead of calling the service
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

## See Also

- [Pool::setCircuitBreakerStrategy](/en/docs/reference/pool/set-circuit-breaker-strategy.html) --- Set the strategy
- [Pool::activate](/en/docs/reference/pool/activate.html) --- Force activation
- [Pool::deactivate](/en/docs/reference/pool/deactivate.html) --- Force deactivation
- [Pool::recover](/en/docs/reference/pool/recover.html) --- Transition to recovery mode
