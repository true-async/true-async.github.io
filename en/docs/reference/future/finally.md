---
layout: docs
lang: en
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /en/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback that always executes on Future completion."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Registers a callback that executes when the `Future` completes regardless of the outcome --- success, error, or cancellation. The Future resolves with the same value or error as the original. Useful for releasing resources.

## Parameters

`finally` — the function to execute on completion. Takes no arguments. Signature: `function(): void`.

## Return value

`Future` — a new Future that will complete with the same value or error as the original.

## Examples

### Example #1 Releasing resources

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### Example #2 Chaining with map, catch, and finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## See also

- [Future::map](/en/docs/reference/future/map.html) — Transform the Future result
- [Future::catch](/en/docs/reference/future/catch.html) — Handle a Future error
- [Future::ignore](/en/docs/reference/future/ignore.html) — Ignore unhandled errors
