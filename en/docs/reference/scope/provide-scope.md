---
layout: docs
lang: en
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /en/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "ScopeProvider interface implementation — returns the current scope."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Implementation of the `ScopeProvider` interface. Returns the scope object itself. This allows `Scope` to be used anywhere a `ScopeProvider` is expected.

## Return Value

`Scope` — the current scope object.

## Examples

### Example #1 Using as a ScopeProvider

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "Running in the provided scope\n";
    });
}

$scope = new Scope();

// Scope itself implements ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Example #2 Polymorphism with ScopeProvider

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

class ServiceContainer implements ScopeProvider {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope {
        return $this->scope;
    }
}

function startWorkers(ScopeProvider $provider, int $count): void {
    $scope = $provider->provideScope();

    for ($i = 0; $i < $count; $i++) {
        $scope->spawn(function() use ($i) {
            echo "Worker $i started\n";
        });
    }
}

// Works with both Scope and ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## See Also

- [Scope::inherit](/en/docs/reference/scope/inherit.html) — Create a child scope
- [Scope::spawn](/en/docs/reference/scope/spawn.html) — Spawn a coroutine in the scope
