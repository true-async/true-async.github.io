---
layout: docs
lang: en
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /en/docs/reference/future/await.html
page_title: "Future::await"
description: "Await the Future result."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Awaits the completion of the `Future` and returns its result. Blocks the current coroutine until the Future is completed. If the Future completed with an error, the method throws that exception. You can pass a `Completable` to cancel the wait by timeout or external condition.

## Parameters

`cancellation` — a wait cancellation object. If provided and triggered before the Future completes, a `CancelledException` will be thrown. Defaults to `null`.

## Return value

`mixed` — the Future result.

## Errors

Throws an exception if the Future completed with an error or was cancelled.

## Examples

### Example #1 Basic result awaiting

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### Example #2 Handling errors during await

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## See also

- [Future::isCompleted](/en/docs/reference/future/is-completed.html) — Check if the Future is completed
- [Future::cancel](/en/docs/reference/future/cancel.html) — Cancel the Future
- [Future::map](/en/docs/reference/future/map.html) — Transform the result
