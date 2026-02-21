---
layout: docs
lang: en
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /en/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Checks whether the scope is finished."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Checks whether all coroutines in the scope have finished. A scope is considered finished when all its coroutines (including child scopes) have completed execution.

## Return Value

`bool` — `true` if all scope coroutines have finished, `false` otherwise.

## Examples

### Example #1 Checking scope completion

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## See Also

- [Scope::isClosed](/en/docs/reference/scope/is-closed.html) — Check if the scope is closed
- [Scope::isCancelled](/en/docs/reference/scope/is-cancelled.html) — Check if the scope is cancelled
- [Scope::awaitCompletion](/en/docs/reference/scope/await-completion.html) — Wait for coroutine completion
