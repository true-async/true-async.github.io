---
layout: docs
lang: en
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /en/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Closes the scope after a specified timeout."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Schedules the scope to be closed after a specified timeout. When the timeout expires, `dispose()` is called, cancelling all coroutines and closing the scope. This is convenient for setting a maximum scope lifetime.

## Parameters

`timeout` — time in milliseconds before the scope is automatically closed.

## Return Value

No value is returned.

## Examples

### Example #1 Limiting execution time

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope will be closed after 10 seconds
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Long operation
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### Example #2 Scope with a limited lifetime

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 seconds for all work

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Won't finish in time
    echo "Task 3: OK\n"; // Will not be printed
});

$scope->awaitCompletion();
```

## See Also

- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Immediate scope closure
- [Scope::disposeSafely](/en/docs/reference/scope/dispose-safely.html) — Safe scope closure
- [timeout()](/en/docs/reference/timeout.html) — Global timeout function
