---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Get the call stack of a suspended coroutine."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Returns the call stack (backtrace) of a suspended coroutine. If the coroutine is not suspended (not yet started, currently running, or completed), returns `null`.

## Parameters

**options**
: A bitmask of options, similar to `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- include `$this` in the trace
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- do not include function arguments

**limit**
: Maximum number of stack frames. `0` -- no limit.

## Return Value

`?array` -- an array of stack frames or `null` if the coroutine is not suspended.

## Examples

### Example #1 Getting the stack of a suspended coroutine

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // let the coroutine start and suspend

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Example #2 Trace for a completed coroutine -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// Before start -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// After completion -- null
var_dump($coroutine->getTrace()); // NULL
```

## See Also

- [Coroutine::isSuspended](/en/docs/reference/coroutine/is-suspended.html) -- Check suspension
- [Coroutine::getSuspendLocation](/en/docs/reference/coroutine/get-suspend-location.html) -- Suspension location
- [Coroutine::getSpawnLocation](/en/docs/reference/coroutine/get-spawn-location.html) -- Creation location
