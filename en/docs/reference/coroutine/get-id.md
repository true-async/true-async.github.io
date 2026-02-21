---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Get the unique identifier of a coroutine."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Returns the unique integer identifier of the coroutine. The identifier is unique within the current PHP process.

## Return Value

`int` -- unique coroutine identifier.

## Examples

### Example #1 Basic usage

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Example #2 Logging with identifier

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' started\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completed\n";
    });
}
```

## See Also

- [Coroutine::getSpawnLocation](/en/docs/reference/coroutine/get-spawn-location.html) -- Coroutine creation location
- [current_coroutine()](/en/docs/reference/current-coroutine.html) -- Get the current coroutine
