---
layout: docs
lang: en
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /en/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Checks whether the scope is cancelled."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Checks whether the scope has been cancelled. A scope is marked as cancelled after a call to `cancel()` or `dispose()`.

## Return Value

`bool` — `true` if the scope has been cancelled, `false` otherwise.

## Examples

### Example #1 Checking scope cancellation

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## See Also

- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel the scope
- [Scope::isFinished](/en/docs/reference/scope/is-finished.html) — Check if the scope is finished
- [Scope::isClosed](/en/docs/reference/scope/is-closed.html) — Check if the scope is closed
