---
layout: docs
lang: en
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /en/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Non-blocking resource acquisition from the pool."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Attempts to acquire a resource from the pool without blocking. If a free resource
is available or the `max` limit has not been reached, returns the resource immediately.
Otherwise, returns `null`.

## Parameters

This method takes no parameters.

## Return Value

Returns a resource from the pool or `null` if no free resources are available
and the maximum limit has been reached.

## Examples

### Example #1 Attempting to acquire a resource

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "All connections are busy, try again later\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Orders: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Example #2 Fallback when pool is unavailable

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Cache unavailable — query database directly
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## See Also

- [Pool::acquire](/en/docs/reference/pool/acquire.html) --- Blocking resource acquisition
- [Pool::release](/en/docs/reference/pool/release.html) --- Release a resource back to the pool
