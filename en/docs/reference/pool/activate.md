---
layout: docs
lang: en
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /en/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Force the pool into the ACTIVE state."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Forcefully transitions the pool to the `ACTIVE` state. Resources become available
for acquisition again. Used for manual Circuit Breaker management, for example,
after confirming that the service has recovered.

## Parameters

This method takes no parameters.

## Return Value

No value is returned.

## Examples

### Example #1 Manual activation after verification

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Suppose the pool was deactivated
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Manually check service availability
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### Example #2 Activation by external signal

```php
<?php

use Async\Pool;

// Webhook handler from the monitoring system
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## See Also

- [Pool::deactivate](/en/docs/reference/pool/deactivate.html) --- Transition to INACTIVE state
- [Pool::recover](/en/docs/reference/pool/recover.html) --- Transition to RECOVERING state
- [Pool::getState](/en/docs/reference/pool/get-state.html) --- Current state
