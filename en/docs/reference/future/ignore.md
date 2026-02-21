---
layout: docs
lang: en
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /en/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Do not propagate unhandled errors to the event loop handler."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Marks the `Future` as ignored. If the Future completes with an error and the error is not handled, it will not be passed to the event loop's unhandled exception handler. Useful for "fire-and-forget" tasks where the result does not matter.

## Return value

`Future` — returns the same Future for method chaining.

## Examples

### Example #1 Ignoring Future errors

```php
<?php

use Async\Future;

// Launch a task whose errors we don't care about
\Async\async(function() {
    // This operation may fail
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// The error will not be passed to the event loop handler
```

### Example #2 Using ignore with method chaining

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // Cache errors are not critical
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## See also

- [Future::catch](/en/docs/reference/future/catch.html) — Handle a Future error
- [Future::finally](/en/docs/reference/future/finally.html) — Callback on Future completion
