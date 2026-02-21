---
layout: docs
lang: en
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /en/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Creates a Future completed with an error."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Creates a `Future` that is immediately completed with the specified error. Calling `await()` on such a Future will throw the provided exception.

## Parameters

`throwable` — the exception with which the Future will be completed.

## Return value

`Future` — a completed Future with an error.

## Examples

### Example #1 Creating a Future with an error

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### Example #2 Using for early error return

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## See also

- [Future::completed](/en/docs/reference/future/completed.html) — Create a Future with a result
- [Future::catch](/en/docs/reference/future/catch.html) — Handle a Future error
- [Future::await](/en/docs/reference/future/await.html) — Await the result
