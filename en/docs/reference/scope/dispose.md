---
layout: docs
lang: en
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /en/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Cancels all coroutines and closes the scope."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Forcefully cancels all coroutines in the scope and closes it. After calling `dispose()`, the scope is marked as both closed and cancelled. New coroutines cannot be added to a closed scope.

This is equivalent to calling `cancel()` followed by closing the scope.

## Return Value

No value is returned.

## Examples

### Example #1 Forcefully closing a scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// All coroutines will be cancelled, scope closed
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Example #2 Cleanup in a try/finally block

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Business logic
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## See Also

- [Scope::disposeSafely](/en/docs/reference/scope/dispose-safely.html) — Safe close (with zombies)
- [Scope::disposeAfterTimeout](/en/docs/reference/scope/dispose-after-timeout.html) — Close after a timeout
- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel without closing the scope
