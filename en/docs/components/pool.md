---
layout: docs
lang: en
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /en/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- universal resource pool for coroutines: creation, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool: Universal Resource Pool

## Why You Need a Pool

When working with coroutines, the problem of sharing I/O descriptors arises.
If the same socket is used by two coroutines that simultaneously write or read
different packets from it, the data will get mixed up and the result will be unpredictable.
Therefore, you cannot simply use the same `PDO` object in different coroutines!

On the other hand, creating a separate connection for each coroutine over and over is a very wasteful strategy.
It negates the advantages of concurrent I/O. Therefore, connection pools are typically used
for interacting with external APIs, databases, and other resources.

A pool solves this problem: resources are created in advance, given to coroutines on request,
and returned for reuse.

```php
use Async\Pool;

// HTTP connection pool
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// A coroutine takes a connection, uses it, and returns it
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Creating a Pool

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // How to create a resource
    destructor:         fn($r) => $r->close(),          // How to destroy a resource
    healthcheck:        fn($r) => $r->ping(),           // Is the resource alive?
    beforeAcquire:      fn($r) => $r->isValid(),        // Check before giving out
    beforeRelease:      fn($r) => !$r->isBroken(),      // Check before returning
    min:                2,                               // Pre-create 2 resources
    max:                10,                              // Maximum 10 resources
    healthcheckInterval: 30000,                          // Check every 30 sec
);
```

| Parameter              | Purpose                                                        | Default |
|------------------------|----------------------------------------------------------------|---------|
| `factory`              | Creates a new resource. **Required**                           | --      |
| `destructor`           | Destroys a resource when removed from the pool                 | `null`  |
| `healthcheck`          | Periodic check: is the resource still alive?                   | `null`  |
| `beforeAcquire`        | Check before giving out. `false` -- destroy and take the next  | `null`  |
| `beforeRelease`        | Check before returning. `false` -- destroy, don't return       | `null`  |
| `min`                  | How many resources to create in advance (pre-warming)          | `0`    |
| `max`                  | Maximum resources (free + in use)                              | `10`   |
| `healthcheckInterval`  | Background health check interval (ms, 0 = disabled)            | `0`    |

## Acquire and Release

### Blocking Acquire

```php
// Wait until a resource becomes available (indefinitely)
$resource = $pool->acquire();

// Wait at most 5 seconds
$resource = $pool->acquire(timeout: 5000);
```

If the pool is full (all resources are in use and `max` is reached), the coroutine **suspends**
and waits until another coroutine returns a resource. Other coroutines continue running.

On timeout, a `PoolException` is thrown.

### Non-blocking tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "All resources are busy, let's try later\n";
} else {
    // Use the resource
    $pool->release($resource);
}
```

`tryAcquire()` returns `null` immediately if a resource is unavailable. The coroutine is not suspended.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // IMPORTANT: always return the resource to the pool!
    $pool->release($resource);
}
```

If `beforeRelease` is set and returns `false`, the resource is considered damaged
and is destroyed instead of being returned to the pool.

## Statistics

```php
echo $pool->count();       // Total resources (free + in use)
echo $pool->idleCount();   // Free, ready to be given out
echo $pool->activeCount(); // Currently being used by coroutines
```

## Closing the Pool

```php
$pool->close();
```

On closing:
- All waiting coroutines receive a `PoolException`
- All free resources are destroyed via `destructor`
- Busy resources are destroyed upon subsequent `release`

## Healthcheck: Background Checking

If `healthcheckInterval` is set, the pool periodically checks free resources.
Dead resources are destroyed and replaced with new ones (if the count has dropped below `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Check: is the connection alive?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Every 10 seconds
);
```

Healthcheck works **only** for free resources. Busy resources are not checked.

## Circuit Breaker

The pool implements the **Circuit Breaker** pattern for managing service availability.

### Three States

| State        | Behavior                                              |
|--------------|-------------------------------------------------------|
| `ACTIVE`     | Everything works, requests go through                 |
| `INACTIVE`   | Service unavailable, `acquire()` throws an exception  |
| `RECOVERING` | Test mode, limited requests                           |

```php
use Async\CircuitBreakerState;

// Check state
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Manual control
$pool->deactivate();  // Switch to INACTIVE
$pool->recover();     // Switch to RECOVERING
$pool->activate();    // Switch to ACTIVE
```

### Automatic Management via Strategy

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

The strategy is called automatically:
- `reportSuccess()` -- on successful resource return to the pool
- `reportFailure()` -- when `beforeRelease` returns `false` (resource is damaged)

## Resource Lifecycle

![Resource Lifecycle](/diagrams/ru/components-pool/resource-lifecycle.svg)

## Real-World Example: Redis Connection Pool

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 coroutines concurrently read from Redis through 20 connections
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO Pool

For PDO, there is a built-in integration with `Async\Pool` that makes pooling completely transparent.
Instead of manual `acquire`/`release`, the pool is managed automatically behind the scenes.

Learn more: [PDO Pool](/en/docs/components/pdo-pool.html)

## What's Next?

- [Async\Pool Architecture](/en/architecture/pool.html) -- internals, diagrams, C API
- [PDO Pool](/en/docs/components/pdo-pool.html) -- transparent pool for PDO
- [Coroutines](/en/docs/components/coroutines.html) -- how coroutines work
- [Channels](/en/docs/components/channels.html) -- data exchange between coroutines
