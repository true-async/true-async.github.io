---
layout: docs
lang: en
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /en/docs/components/interfaces.html
page_title: "Interfaces"
description: "Base TrueAsync interfaces -- Awaitable, Completable, Timeout, ScopeProvider and SpawnStrategy."
---

# Base Interfaces

## Awaitable

```php
interface Async\Awaitable {}
```

A marker interface for all objects that can be awaited. Contains no methods -- serves for type-checking.
Awaitable objects can change states multiple times, meaning they are `multiple-shot` objects.

Implemented by: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Extends `Awaitable`. `Async\Completable` objects change state only once (`one-shot`).

Implemented by: `Coroutine`, `Future`, `Timeout`.

### cancel()

Cancels the object. The optional `$cancellation` parameter allows passing a specific cancellation error.

### isCompleted()

Returns `true` if the object has already completed (successfully or with an error).

### isCancelled()

Returns `true` if the object was cancelled.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

A timeout object. Created via the `timeout()` function:

```php
<?php
use function Async\timeout;
use function Async\await;

// Create a 5-second timeout
$timer = timeout(5000);

// Use as an awaiting limiter
$result = await($coroutine, $timer);
```

`Timeout` cannot be created via `new` -- only through `timeout()`.

When the timeout triggers, `Async\TimeoutException` is thrown.

### Cancelling a Timeout

If the timeout is no longer needed, it can be cancelled:

```php
<?php
$timer = timeout(5000);

// ... operation completed faster
$timer->cancel(); // Release the timer
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

An interface that allows providing a `Scope` for creating coroutines. Used with `spawn_with()`:

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Working in the provided Scope\n";
});
?>
```

If `provideScope()` returns `null`, the coroutine is created in the current Scope.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Extends `ScopeProvider` with lifecycle hooks -- allows executing code before and after a coroutine is enqueued.

### beforeCoroutineEnqueue()

Called **before** the coroutine is added to the scheduler queue. Returns an array of parameters.

### afterCoroutineEnqueue()

Called **after** the coroutine is added to the queue.

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "Coroutine #{$coroutine->getId()} will be created\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Coroutine #{$coroutine->getId()} added to queue\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Executing\n";
});
?>
```

## CircuitBreaker and CircuitBreakerStrategy

These interfaces are described in the [Async\Pool](/en/docs/components/pool.html) documentation.

## See Also

- [Coroutines](/en/docs/components/coroutines.html) -- the basic unit of concurrency
- [Scope](/en/docs/components/scope.html) -- managing coroutine lifetimes
- [Future](/en/docs/components/future.html) -- a promise of a result
- [spawn_with()](/en/docs/reference/spawn-with.html) -- launching a coroutine with a provider
