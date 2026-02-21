---
layout: docs
lang: en
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /en/docs/reference/protect.html
page_title: "protect()"
description: "protect() — execute code in a non-cancellable mode to protect critical sections."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Executes a closure in a non-cancellable mode. Coroutine cancellation is deferred until the closure completes.

## Description

```php
protect(\Closure $closure): mixed
```

While `$closure` is executing, the coroutine is marked as protected. If a cancellation request arrives during this time, `AsyncCancellation` will be thrown only **after** the closure finishes.

## Parameters

**`closure`**
A closure to execute without interruption by cancellation.

## Return Values

Returns the value returned by the closure.

## Examples

### Example #1 Protecting a transaction

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// If the coroutine was cancelled during protect(),
// AsyncCancellation will be thrown here — after commit()
?>
```

### Example #2 Protecting file writes

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### Example #3 Getting a result

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### Example #4 Deferred cancellation and diagnostics

During `protect()`, cancellation is saved but not applied. This can be checked via coroutine methods:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // Inside protect() after cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Protected operation completed\n";
    });

    // AsyncCancellation is thrown here — after protect()
    echo "This code will not execute\n";
});

suspend(); // Let the coroutine enter protect()
$coroutine->cancel();
suspend(); // Let protect() finish

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` immediately after `cancel()`, even inside `protect()`
- `isCancelled()` — `false` while `protect()` is running, then `true`

## Notes

> **Note:** If cancellation occurred during `protect()`, `AsyncCancellation` will be thrown immediately after the closure returns — the return value of `protect()` will be lost in this case.

> **Note:** `protect()` does not make the closure atomic — other coroutines can execute during I/O operations inside it. `protect()` only guarantees that **cancellation** will not interrupt execution.

## See Also

- [Cancellation](/en/docs/components/cancellation.html) — cooperative cancellation mechanism
- [suspend()](/en/docs/reference/suspend.html) — suspending a coroutine
