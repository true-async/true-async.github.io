---
layout: docs
lang: en
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /en/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — get the global root context visible from all scopes."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Returns the global root `Async\Context` object, shared across the entire request.

## Description

```php
root_context(): Async\Context
```

Returns the top-level context. Values set here are visible via `find()` from any context in the hierarchy.

## Return Values

An `Async\Context` object.

## Examples

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Set global configuration
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Accessible from any coroutine via find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## See Also

- [current_context()](/en/docs/reference/current-context.html) — Scope context
- [coroutine_context()](/en/docs/reference/coroutine-context.html) — coroutine context
- [Context](/en/docs/components/context.html) — the context concept
