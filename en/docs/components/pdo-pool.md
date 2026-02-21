---
layout: docs
lang: en
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /en/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- built-in database connection pool for coroutines: transparent pooling, transactions, automatic rollback."
---

# PDO Pool: Database Connection Pool

## The Problem

When working with coroutines, the problem of sharing I/O descriptors arises.
If the same socket is used by two coroutines that simultaneously write or read
different packets from it, the data will get mixed up and the result will be unpredictable.
Therefore, you cannot simply use the same `PDO` object in different coroutines!

On the other hand, creating a separate connection for each coroutine over and over is a very wasteful strategy.
It negates the advantages of concurrent I/O. Therefore, connection pools are typically used
for interacting with external APIs, databases, and other resources.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Ten coroutines simultaneously use the same $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Another coroutine already called COMMIT on this same connection!
        $pdo->commit(); // Chaos
    });
}
```

You could create a separate connection in each coroutine, but then with a thousand coroutines you'd get a thousand TCP connections.
MySQL allows 151 simultaneous connections by default. PostgreSQL -- 100.

## The Solution: PDO Pool

**PDO Pool** -- a database connection pool built into the PHP core.
It automatically gives each coroutine its own connection from a pre-prepared set
and returns it back when the coroutine finishes working.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Ten coroutines -- each gets its own connection
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Pool automatically allocates a connection for this coroutine
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // Connection is returned to the pool
    });
}
```

From the outside, the code looks as if you're working with a regular `PDO`. The pool is completely transparent.

## How to Enable

The pool is enabled via `PDO` constructor attributes:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Enable pool
    PDO::ATTR_POOL_MIN                  => 0,     // Minimum connections (default 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Maximum connections (default 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Health check interval (sec, 0 = disabled)
]);
```

| Attribute                   | Meaning                                                              | Default |
|-----------------------------|----------------------------------------------------------------------|---------|
| `POOL_ENABLED`              | Enable the pool                                                      | `false` |
| `POOL_MIN`                  | Minimum number of connections the pool keeps open                    | `0`     |
| `POOL_MAX`                  | Maximum number of simultaneous connections                           | `10`    |
| `POOL_HEALTHCHECK_INTERVAL` | How often to check that a connection is alive (in seconds)           | `0`     |

## Binding Connections to Coroutines

Each coroutine gets **its own** connection from the pool. All calls to `query()`, `exec()`, `prepare()`
within a single coroutine go through the same connection.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // All three queries go through connection #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Coroutine finished -- connection #1 returns to pool
});

$coro2 = spawn(function() use ($pdo) {
    // All queries go through connection #2
    $pdo->query("SELECT 4");
    // Coroutine finished -- connection #2 returns to pool
});
```

If a coroutine is no longer using the connection (no active transactions or statements),
the pool may return it earlier -- without waiting for the coroutine to finish.

## Transactions

Transactions work the same as in regular PDO. But the pool guarantees
that while a transaction is active, the connection is **pinned** to the coroutine and won't return to the pool.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Only after commit can the connection return to the pool
});
```

### Automatic Rollback

If a coroutine finishes without calling `commit()`, the pool automatically rolls back the transaction
before returning the connection to the pool. This is a safeguard against accidental data loss.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Forgot commit()
    // Coroutine finished -- pool will call ROLLBACK automatically
});
```

## Connection Lifecycle

![Connection lifecycle in the pool](/diagrams/ru/components-pdo-pool/connection-lifecycle.svg)

A detailed technical diagram with internal calls is in the [PDO Pool architecture](/en/architecture/pdo-pool.html).

## Accessing the Pool Object

The `getPool()` method returns the `Async\Pool` object through which you can get statistics:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool is active: " . get_class($pool) . "\n"; // Async\Pool
}
```

If the pool is not enabled, `getPool()` returns `null`.

## When to Use

**Use PDO Pool when:**
- The application runs in asynchronous mode with TrueAsync
- Multiple coroutines simultaneously access the database
- You need to limit the number of connections to the database

**Not needed when:**
- The application is synchronous (classic PHP)
- Only one coroutine works with the database
- Persistent connections are used (they are incompatible with the pool)

## Supported Drivers

| Driver       | Pool Support |
|--------------|--------------|
| `pdo_mysql`  | Yes          |
| `pdo_pgsql`  | Yes          |
| `pdo_sqlite` | Yes          |
| `pdo_odbc`   | No           |

## Error Handling

If the pool cannot create a connection (wrong credentials, unavailable server),
the exception is propagated to the coroutine that requested the connection:

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Failed to connect: " . $e->getMessage() . "\n";
    }
});
```

Note `POOL_MIN => 0`: if you set the minimum higher than zero, the pool will try
to create connections in advance, and the error will occur when creating the PDO object.

## Real-World Example: Parallel Order Processing

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Get a list of orders to process
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Each coroutine gets its own connection from the pool
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// Wait for all coroutines to complete
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Order #$processedId processed\n";
}
```

Ten orders are processed concurrently, but through a maximum of five database connections.
Each transaction is isolated. Connections are reused between coroutines.

## What's Next?

- [Interactive PDO Pool Demo](/en/interactive/pdo-pool-demo.html) -- a visual demonstration of connection pool operation
- [PDO Pool Architecture](/en/architecture/pdo-pool.html) -- pool internals, diagrams, connection lifecycle
- [Coroutines](/en/docs/components/coroutines.html) -- how coroutines work
- [Scope](/en/docs/components/scope.html) -- managing groups of coroutines
- [spawn()](/en/docs/reference/spawn.html) -- launching coroutines
- [await()](/en/docs/reference/await.html) -- awaiting results
