---
layout: docs
lang: en
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /en/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — launch a coroutine in a specified Scope or via a ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Launches a function in a new coroutine bound to the specified `Scope` or `ScopeProvider`.

## Description

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Creates and starts a new coroutine in the Scope provided by `$provider`. This allows explicit control over which Scope the coroutine will run in.

## Parameters

**`provider`**
An object implementing the `Async\ScopeProvider` interface. Typically this is:
- `Async\Scope` — directly, since `Scope` implements `ScopeProvider`
- A custom class implementing `ScopeProvider`
- An object implementing `SpawnStrategy` for lifecycle management

**`task`**
A function or closure to execute in the coroutine.

**`args`**
Optional parameters passed to `task`.

## Return Values

Returns an `Async\Coroutine` object representing the launched coroutine.

## Errors/Exceptions

- `Async\AsyncException` — if the Scope is closed or cancelled
- `TypeError` — if `$provider` does not implement `ScopeProvider`

## Examples

### Example #1 Launching in a specific Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// Wait for all coroutines in the scope to complete
$scope->awaitCompletion();
?>
```

### Example #2 Inherited Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Working in child Scope\n";
});

// Cancelling parent also cancels child
$parentScope->cancel();
?>
```

### Example #3 Using with ScopeProvider

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker error: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // Working in a managed scope
});

$worker->shutdown();
?>
```

### Example #4 Passing arguments

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Use the passed arguments
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Notes

> **Note:** If `ScopeProvider::provideScope()` returns `null`, the coroutine is created in the current Scope.

> **Note:** You cannot create a coroutine in a closed or cancelled Scope — an exception will be thrown.

## See Also

- [spawn()](/en/docs/reference/spawn.html) — launch a coroutine in the current Scope
- [Scope](/en/docs/components/scope.html) — managing coroutine lifetimes
- [Interfaces](/en/docs/components/interfaces.html) — ScopeProvider and SpawnStrategy
