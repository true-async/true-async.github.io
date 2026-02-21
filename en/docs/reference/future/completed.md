---
layout: docs
lang: en
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /en/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Creates an already completed Future with a result."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Creates an already completed `Future` with the specified value. This is a factory method that returns a `Future` immediately containing a result. Useful for returning an already known value from functions that return a `Future`.

## Parameters

`value` — the value with which the Future will be completed. Defaults to `null`.

## Return value

`Future` — a completed Future with the specified value.

## Examples

### Example #1 Creating a Future with a ready value

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Example #2 Using in a function that returns a Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // If data is in cache, return immediately
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Otherwise start an async operation
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## See also

- [Future::failed](/en/docs/reference/future/failed.html) — Create a Future with an error
- [Future::__construct](/en/docs/reference/future/construct.html) — Create a Future via FutureState
- [Future::await](/en/docs/reference/future/await.html) — Await the result
