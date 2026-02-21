---
layout: docs
lang: en
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /en/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Marks the scope as not safe — coroutines receive cancellation instead of becoming zombies."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Marks the scope as "not safe". When `disposeSafely()` is called on such a scope, coroutines **do not** become zombies but instead receive a cancellation signal. This is useful for background tasks that do not require guaranteed completion.

The method returns the same scope object, enabling method chaining (fluent interface).

## Return Value

`Scope` — the same scope object (for method chaining).

## Examples

### Example #1 Scope for background tasks

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Background task: cache cleanup
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// With disposeSafely(), coroutines will be cancelled instead of becoming zombies
$scope->disposeSafely();
```

### Example #2 Using with inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// On close: coroutines will be cancelled, not turned into zombies
$bgScope->disposeSafely();
```

## See Also

- [Scope::disposeSafely](/en/docs/reference/scope/dispose-safely.html) — Safely close the scope
- [Scope::dispose](/en/docs/reference/scope/dispose.html) — Forcefully close the scope
- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel all coroutines
