---
layout: docs
lang: en
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /en/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Safely closes the scope — coroutines become zombies."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Safely closes the scope. Active coroutines **are not cancelled** but instead become zombie coroutines: they continue running, but the scope is considered closed. Zombie coroutines will finish on their own when they complete their work.

If the scope is marked as "not safe" via `asNotSafely()`, coroutines will be cancelled instead of becoming zombies.

## Return Value

No value is returned.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// Scope is closed, but the coroutine continues running
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Coroutine continues executing in the background
```

### Example #2 Graceful shutdown with zombie waiting

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// Wait for zombie coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## See Also

- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Forcefully close the scope
- [Scope::asNotSafely](/en/docs/reference/scope/as-not-safely.html) — Disable zombie behavior
- [Scope::awaitAfterCancellation](/en/docs/reference/scope/await-after-cancellation.html) — Wait for zombie coroutines
