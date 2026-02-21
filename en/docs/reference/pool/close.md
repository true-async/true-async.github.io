---
layout: docs
lang: en
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /en/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Close the pool and destroy all resources."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Closes the resource pool. All idle resources are destroyed via the `destructor`
(if one was provided). All coroutines waiting for a resource via `acquire()` receive
a `PoolException`. After closing, any calls to `acquire()` and `tryAcquire()`
throw an exception.

## Parameters

This method takes no parameters.

## Return Value

No value is returned.

## Examples

### Example #1 Graceful shutdown

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Close all prepared statements and connection
    },
    min: 2,
    max: 10
);

// ... work with the pool ...

// Close the pool when the application shuts down
$pool->close();
```

### Example #2 Waiting coroutines receive an exception

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // took the only resource

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // waiting for release
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // waiting coroutine will receive PoolException
```

## See Also

- [Pool::isClosed](/en/docs/reference/pool/is-closed.html) --- Check if the pool is closed
- [Pool::__construct](/en/docs/reference/pool/construct.html) --- Create a pool
