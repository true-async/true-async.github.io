---
layout: docs
lang: en
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /en/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Total number of resources in the pool."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Returns the total number of resources in the pool, including both idle
and active (in-use) resources.

## Parameters

This method takes no parameters.

## Return Value

The total number of resources in the pool.

## Examples

### Example #1 Monitoring the pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total resources: " . $pool->count() . "\n";       // 2 (min)
echo "Idle: " . $pool->idleCount() . "\n";               // 2
echo "Active: " . $pool->activeCount() . "\n";           // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // a new resource is created

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## See Also

- [Pool::idleCount](/en/docs/reference/pool/idle-count.html) --- Number of idle resources
- [Pool::activeCount](/en/docs/reference/pool/active-count.html) --- Number of active resources
