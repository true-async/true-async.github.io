---
layout: docs
lang: en
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /en/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Release a resource back to the pool."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Returns a previously acquired resource back to the pool. If a `beforeRelease` hook
was set when creating the pool, it is called before the return. If the hook
returns `false`, the resource is destroyed instead of being returned to the pool.

If there are coroutines waiting for a resource via `acquire()`, the resource is
immediately handed to the first waiting coroutine.

## Parameters

**resource**
: A resource previously acquired via `acquire()` or `tryAcquire()`.

## Return Value

No value is returned.

## Examples

### Example #1 Safe return via finally

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### Example #2 Automatic destruction via beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // If the connection is broken — do not return to the pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // If isAlive() returns false, the client will be destroyed
    $pool->release($client);
}
```

## See Also

- [Pool::acquire](/en/docs/reference/pool/acquire.html) --- Acquire a resource from the pool
- [Pool::tryAcquire](/en/docs/reference/pool/try-acquire.html) --- Non-blocking acquisition
- [Pool::close](/en/docs/reference/pool/close.html) --- Close the pool
