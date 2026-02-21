---
layout: docs
lang: en
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /en/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Sets an exception handler for child Scopes."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Sets an exception handler for exceptions thrown in child scopes. When a child scope finishes with an error, this handler is called, preventing the exception from propagating to the parent scope.

## Parameters

`exceptionHandler` — the exception handling function for child scopes. Accepts a `\Throwable` as an argument.

## Return Value

No value is returned.

## Examples

### Example #1 Catching child scope errors

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// Error handled, does not propagate to $parentScope
```

### Example #2 Isolating errors between modules

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// Each module in its own scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // An error here will not affect $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## See Also

- [Scope::setExceptionHandler](/en/docs/reference/scope/set-exception-handler.html) — Exception handler for coroutines
- [Scope::inherit](/en/docs/reference/scope/inherit.html) — Create a child scope
- [Scope::getChildScopes](/en/docs/reference/scope/get-child-scopes.html) — Get child scopes
