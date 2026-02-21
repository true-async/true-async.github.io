---
layout: docs
lang: en
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /en/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Handle a Future error."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Registers an error handler for the `Future`. The callback is invoked if the Future completed with an exception. If the callback returns a value, it becomes the result of the new Future. If the callback throws an exception, the new Future completes with that error.

## Parameters

`catch` — the error handling function. Receives a `Throwable`, may return a value for recovery. Signature: `function(\Throwable $e): mixed`.

## Return value

`Future` — a new Future with the error handling result, or with the original value if there was no error.

## Examples

### Example #1 Error handling with recovery

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recovery
    });

$result = $future->await();
echo $result; // default value
```

### Example #2 Catching errors in async operations

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Log the error and return an empty array
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## See also

- [Future::map](/en/docs/reference/future/map.html) — Transform the Future result
- [Future::finally](/en/docs/reference/future/finally.html) — Callback on Future completion
- [Future::ignore](/en/docs/reference/future/ignore.html) — Ignore unhandled errors
