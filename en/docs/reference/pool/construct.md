---
layout: docs
lang: en
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /en/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Create a new resource pool."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Creates a new resource pool. The pool manages a set of reusable objects
(connections, clients, file descriptors, etc.), automatically creating
and destroying them as needed.

## Parameters

**factory**
: A factory function for creating a new resource. Called each time
  the pool needs a new resource and the current count is less than `max`.
  Must return a ready-to-use resource.

**destructor**
: A function for properly destroying a resource. Called when the pool is closed
  or when a resource is removed (e.g., after a failed health check).
  `null` --- the resource is simply removed from the pool without additional actions.

**healthcheck**
: A resource health check function. Takes a resource, returns `bool`.
  `true` --- the resource is healthy, `false` --- the resource will be destroyed and replaced.
  `null` --- no health check is performed.

**beforeAcquire**
: A hook called before a resource is handed out. Takes the resource.
  Can be used to prepare the resource (e.g., reset state).
  `null` --- no hook.

**beforeRelease**
: A hook called before a resource is returned to the pool. Takes the resource,
  returns `bool`. If it returns `false`, the resource is destroyed instead of
  being returned to the pool.
  `null` --- no hook.

**min**
: The minimum number of resources in the pool. When the pool is created,
  `min` resources are created immediately. Default is `0`.

**max**
: The maximum number of resources in the pool. When the limit is reached,
  `acquire()` calls block until a resource is released.
  Default is `10`.

**healthcheckInterval**
: The interval for background resource health checks in milliseconds.
  `0` --- background checking is disabled (check only on acquire).

## Examples

### Example #1 PDO connection pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO is closed automatically when removed
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // check every 30 seconds
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Example #2 Pool with hooks

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // reset to default database
    },
    beforeRelease: function(RedisClient $r): bool {
        // If the connection is broken — destroy the resource
        return $r->isConnected();
    },
    max: 5
);
```

## See Also

- [Pool::acquire](/en/docs/reference/pool/acquire.html) --- Acquire a resource from the pool
- [Pool::release](/en/docs/reference/pool/release.html) --- Release a resource back to the pool
- [Pool::close](/en/docs/reference/pool/close.html) --- Close the pool
