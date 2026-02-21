---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Get the coroutine suspension location as a string."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Returns the coroutine suspension location in the format `"file:line"`. If the information is unavailable, returns `"unknown"`.

## Return Value

`string` -- a string like `"/app/script.php:42"` or `"unknown"`.

## Examples

### Example #1 Diagnosing a stuck coroutine

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // stuck here
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## See Also

- [Coroutine::getSuspendFileAndLine](/en/docs/reference/coroutine/get-suspend-file-and-line.html) -- File and line as an array
- [Coroutine::getSpawnLocation](/en/docs/reference/coroutine/get-spawn-location.html) -- Creation location
- [Coroutine::getTrace](/en/docs/reference/coroutine/get-trace.html) -- Full call stack
