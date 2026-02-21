---
layout: docs
lang: en
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /en/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Spawns a coroutine in the given scope."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Spawns a new coroutine within the given scope. The coroutine will be bound to the scope and managed by its lifecycle: when the scope is cancelled or closed, all its coroutines will also be affected.

## Parameters

`callable` — the closure to be executed as a coroutine.

`params` — arguments to pass to the closure.

## Return Value

`Coroutine` — the spawned coroutine object.

## Examples

### Example #1 Basic usage

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Example #2 Passing parameters

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... perform the request
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## See Also

- [spawn()](/en/docs/reference/spawn.html) — Global function for spawning coroutines
- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel all scope coroutines
- [Scope::awaitCompletion](/en/docs/reference/scope/await-completion.html) — Wait for coroutine completion
