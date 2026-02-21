---
layout: docs
lang: en
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Checks whether the scope is closed."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Checks whether the scope is closed. A scope is considered closed after a call to `dispose()` or `disposeSafely()`. New coroutines cannot be added to a closed scope.

## Return Value

`bool` — `true` if the scope is closed, `false` otherwise.

## Examples

### Example #1 Checking scope state

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Example #2 Guarding against adding to a closed scope

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## See Also

- [Scope::isFinished](/en/docs/reference/scope/is-finished.html) — Check if the scope is finished
- [Scope::isCancelled](/en/docs/reference/scope/is-cancelled.html) — Check if the scope is cancelled
- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Close the scope
