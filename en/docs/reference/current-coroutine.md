---
layout: docs
lang: en
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /en/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — get the object of the currently executing coroutine."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Returns the object of the currently executing coroutine.

## Description

```php
current_coroutine(): Async\Coroutine
```

## Return Values

An `Async\Coroutine` object representing the current coroutine.

## Errors/Exceptions

`Async\AsyncException` — if called outside a coroutine.

## Examples

### Example #1 Getting the coroutine ID

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### Example #2 Diagnostics

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Spawned from: " . $coro->getSpawnLocation() . "\n";
    echo "Status: " . ($coro->isRunning() ? 'running' : 'suspended') . "\n";
});
?>
```

## See Also

- [get_coroutines()](/en/docs/reference/get-coroutines.html) — list of all coroutines
- [Coroutines](/en/docs/components/coroutines.html) — the coroutine concept
