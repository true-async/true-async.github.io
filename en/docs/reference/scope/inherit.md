---
layout: docs
lang: en
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /en/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Creates a new Scope that inherits from a specified or current scope."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Creates a new `Scope` that inherits from the specified parent scope. If the `$parentScope` parameter is not provided (or is `null`), the new scope inherits from the current active scope.

The child scope inherits exception handlers and cancellation policies from the parent.

## Parameters

`parentScope` — the parent scope from which the new scope will inherit. If `null`, the current active scope is used.

## Return Value

`Scope` — a new child scope.

## Examples

### Example #1 Creating a child scope from the current one

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Inside the coroutine, the current scope is $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Example #2 Explicitly specifying the parent scope

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// Cancelling the parent also cancels the child scope
$rootScope->cancel();
```

## See Also

- [Scope::\_\_construct](/en/docs/reference/scope/construct.html) — Create a root Scope
- [Scope::getChildScopes](/en/docs/reference/scope/get-child-scopes.html) — Get child scopes
- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Cancel and close the scope
