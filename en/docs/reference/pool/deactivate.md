---
layout: docs
lang: en
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /en/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Force the pool into the INACTIVE state."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Forcefully transitions the pool to the `INACTIVE` state. In this state,
the pool rejects all resource acquisition requests. Used for manual
deactivation when problems with an external service are detected.

Unlike `close()`, deactivation is reversible --- the pool can be returned
to a working state via `activate()` or `recover()`.

## Parameters

This method takes no parameters.

## Return Value

No value is returned.

## Examples

### Example #1 Deactivation upon detecting a problem

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Upon detecting a critical error
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### Example #2 Planned maintenance

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## See Also

- [Pool::activate](/en/docs/reference/pool/activate.html) --- Transition to ACTIVE state
- [Pool::recover](/en/docs/reference/pool/recover.html) --- Transition to RECOVERING state
- [Pool::getState](/en/docs/reference/pool/get-state.html) --- Current state
- [Pool::close](/en/docs/reference/pool/close.html) --- Permanent pool closure (irreversible)
