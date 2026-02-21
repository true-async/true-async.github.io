---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Get information about what the coroutine is awaiting."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Returns debug information about what the coroutine is currently awaiting. Useful for diagnosing stuck coroutines.

## Return Value

`array` -- an array with awaiting information. An empty array if the information is unavailable.

## Examples

### Example #1 Diagnosing awaiting state

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## See Also

- [Coroutine::isSuspended](/en/docs/reference/coroutine/is-suspended.html) -- Check suspension
- [Coroutine::getTrace](/en/docs/reference/coroutine/get-trace.html) -- Call stack
- [Coroutine::getSuspendLocation](/en/docs/reference/coroutine/get-suspend-location.html) -- Suspension location
