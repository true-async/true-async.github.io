---
layout: docs
lang: en
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /en/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Acquire a resource from the pool with waiting."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Acquires a resource from the pool. If no free resources are available and the maximum
limit has been reached, the coroutine blocks until a resource becomes available.

If the pool has a free resource, it is returned immediately. If there are no free resources
but the `max` limit has not been reached, a new resource is created via `factory`. Otherwise,
the call waits for a resource to be released.

## Parameters

**timeout**
: Maximum wait time in milliseconds.
  `0` --- wait indefinitely.
  If the timeout is exceeded, a `PoolException` is thrown.

## Return Value

Returns a resource from the pool.

## Errors

Throws `Async\PoolException` if:
- The wait timeout is exceeded.
- The pool is closed.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Get a connection (waits if necessary)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Example #2 With timeout

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // wait no more than 5 seconds
    // work with connection...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## See Also

- [Pool::tryAcquire](/en/docs/reference/pool/try-acquire.html) --- Non-blocking resource acquisition
- [Pool::release](/en/docs/reference/pool/release.html) --- Release a resource back to the pool
- [Pool::__construct](/en/docs/reference/pool/construct.html) --- Create a pool
