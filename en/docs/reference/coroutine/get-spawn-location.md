---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Get the coroutine creation location as a string."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Returns the coroutine creation location in the format `"file:line"`. If the information is unavailable, returns `"unknown"`.

## Return Value

`string` -- a string like `"/app/script.php:42"` or `"unknown"`.

## Examples

### Example #1 Debug output

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### Example #2 Logging all coroutines

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## See Also

- [Coroutine::getSpawnFileAndLine](/en/docs/reference/coroutine/get-spawn-file-and-line.html) -- File and line as an array
- [Coroutine::getSuspendLocation](/en/docs/reference/coroutine/get-suspend-location.html) -- Suspension location
- [get_coroutines()](/en/docs/reference/get-coroutines.html) -- All active coroutines
