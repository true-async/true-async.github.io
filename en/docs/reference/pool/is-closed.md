---
layout: docs
lang: en
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Check if the pool is closed."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Checks whether the pool has been closed by a `close()` call.

## Parameters

This method takes no parameters.

## Return Value

Returns `true` if the pool is closed, `false` if the pool is active.

## Examples

### Example #1 Checking pool state

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### Example #2 Conditional pool usage

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Connection pool is closed');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## See Also

- [Pool::close](/en/docs/reference/pool/close.html) --- Close the pool
- [Pool::getState](/en/docs/reference/pool/get-state.html) --- Circuit Breaker state
