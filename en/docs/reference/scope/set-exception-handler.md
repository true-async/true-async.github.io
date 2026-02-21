---
layout: docs
lang: en
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /en/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Sets an exception handler for child coroutines."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Sets an exception handler for exceptions thrown in child coroutines of the scope. When a coroutine finishes with an unhandled exception, instead of the error propagating upward, the specified handler is called.

## Parameters

`exceptionHandler` — the exception handling function. Accepts a `\Throwable` as an argument.

## Return Value

No value is returned.

## Examples

### Example #1 Handling coroutine errors

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// Log will contain: "Coroutine error: Something went wrong"
```

### Example #2 Centralized error logging

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## See Also

- [Scope::setChildScopeExceptionHandler](/en/docs/reference/scope/set-child-scope-exception-handler.html) — Exception handler for child scopes
- [Scope::finally](/en/docs/reference/scope/on-finally.html) — Callback on scope completion
