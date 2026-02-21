---
layout: docs
lang: en
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /en/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — get a list of all active coroutines for diagnostics."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Returns an array of all active coroutines. Useful for diagnostics and monitoring.

## Description

```php
get_coroutines(): array
```

## Return Values

An array of `Async\Coroutine` objects — all coroutines registered in the current request.

## Examples

### Example #1 Monitoring coroutines

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Let the coroutines start
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, spawned at %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'suspended' : 'running',
        $coro->getSpawnLocation()
    );
}
?>
```

### Example #2 Detecting leaks

```php
<?php
use function Async\get_coroutines;

// At the end of a request, check for unfinished coroutines
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Unfinished coroutine: " . $coro->getSpawnLocation());
    }
}
?>
```

## See Also

- [current_coroutine()](/en/docs/reference/current-coroutine.html) — current coroutine
- [Coroutines](/en/docs/components/coroutines.html) — the coroutine concept
