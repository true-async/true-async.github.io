---
layout: docs
lang: en
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /en/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Number of active resources in the pool."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Returns the number of resources that are currently in use
(acquired via `acquire()` or `tryAcquire()` and not yet returned
via `release()`).

## Parameters

This method takes no parameters.

## Return Value

The number of active resources.

## Examples

### Example #1 Counting active resources

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

echo $pool->activeCount() . "\n"; // 0

$r1 = $pool->acquire();
$r2 = $pool->acquire();
echo $pool->activeCount() . "\n"; // 2

$pool->release($r1);
echo $pool->activeCount() . "\n"; // 1
```

### Example #2 Displaying pool statistics

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, active=%d, idle=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## See Also

- [Pool::idleCount](/en/docs/reference/pool/idle-count.html) --- Number of idle resources
- [Pool::count](/en/docs/reference/pool/count.html) --- Total number of resources
