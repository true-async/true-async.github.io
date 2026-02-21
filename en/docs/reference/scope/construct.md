---
layout: docs
lang: en
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /en/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Creates a new root Scope."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Creates a new root `Scope`. A root scope has no parent scope and serves as an independent unit for managing the lifecycle of coroutines.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### Example #2 Creating multiple independent scopes

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// Cancelling one scope does not affect the other
$scopeA->cancel();

// $scopeB continues running
$scopeB->awaitCompletion();
```

## See Also

- [Scope::inherit](/en/docs/reference/scope/inherit.html) — Create a child Scope
- [Scope::spawn](/en/docs/reference/scope/spawn.html) — Spawn a coroutine in the scope
