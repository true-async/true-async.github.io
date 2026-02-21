---
layout: docs
lang: en
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /en/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Returns an array of child scopes."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Returns an array of all child scopes created via `Scope::inherit()` from the given scope. Useful for monitoring and debugging the scope hierarchy.

## Return Value

`array` — an array of `Scope` objects that are children of the given scope.

## Examples

### Example #1 Getting child scopes

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Example #2 Monitoring child scope state

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancelled',
        $child->isFinished()  => 'finished',
        $child->isClosed()    => 'closed',
        default               => 'active',
    };
    echo "Scope: $status\n";
}
```

## See Also

- [Scope::inherit](/en/docs/reference/scope/inherit.html) — Create a child scope
- [Scope::setChildScopeExceptionHandler](/en/docs/reference/scope/set-child-scope-exception-handler.html) — Exception handler for child scopes
