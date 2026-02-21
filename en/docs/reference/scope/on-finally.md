---
layout: docs
lang: en
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /en/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Registers a callback to be invoked when the scope completes."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Registers a callback function that will be executed when the scope completes. This is the equivalent of a `finally` block for a scope, guaranteeing that cleanup code runs regardless of how the scope finished (normally, by cancellation, or with an error).

## Parameters

`callback` — the closure that will be called when the scope completes.

## Return Value

No value is returned.

## Examples

### Example #1 Resource cleanup

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // Close connections, delete temporary files
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// Output: "Executing task"
// Output: "Scope completed, cleaning up resources"
```

### Example #2 Multiple callbacks

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Both callbacks will be invoked when the scope completes
```

## See Also

- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Close the scope
- [Scope::isFinished](/en/docs/reference/scope/is-finished.html) — Check if the scope is finished
- [Coroutine::finally](/en/docs/reference/coroutine/on-finally.html) — Callback on coroutine completion
