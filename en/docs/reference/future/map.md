---
layout: docs
lang: en
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /en/docs/reference/future/map.html
page_title: "Future::map"
description: "Transform the Future result."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Transforms the `Future` result using a callback function. The callback receives the value of the completed Future and returns a new value. Analogous to `then()` in Promise-based APIs. If the original Future completed with an error, the callback is not invoked, and the error is passed through to the new Future.

## Parameters

`map` — the transformation function. Receives the Future result, returns a new value. Signature: `function(mixed $value): mixed`.

## Return value

`Future` — a new Future containing the transformed result.

## Examples

### Example #1 Transforming the result

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### Example #2 Chain of transformations for async loading

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## See also

- [Future::catch](/en/docs/reference/future/catch.html) — Handle a Future error
- [Future::finally](/en/docs/reference/future/finally.html) — Callback on Future completion
- [Future::await](/en/docs/reference/future/await.html) — Await the result
