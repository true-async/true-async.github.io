---
layout: docs
lang: en
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /en/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Number of idle resources in the pool."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Returns the number of idle (unused) resources that are ready to be acquired.

## Parameters

This method takes no parameters.

## Return Value

The number of idle resources in the pool.

## Examples

### Example #1 Tracking idle resources

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 3,
    max: 10
);

echo $pool->idleCount() . "\n"; // 3

$conn = $pool->acquire();
echo $pool->idleCount() . "\n"; // 2

$pool->release($conn);
echo $pool->idleCount() . "\n"; // 3
```

### Example #2 Adaptive strategy

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// If few idle resources remain — reduce load
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## See Also

- [Pool::activeCount](/en/docs/reference/pool/active-count.html) --- Number of active resources
- [Pool::count](/en/docs/reference/pool/count.html) --- Total number of resources
