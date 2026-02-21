---
layout: docs
lang: en
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /en/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — get the context of the current Scope."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Returns the `Async\Context` object bound to the current Scope.

## Description

```php
current_context(): Async\Context
```

If the context for the current Scope has not been created yet, it is created automatically.
Values set in this context are visible to all coroutines in the current Scope via `find()`.

## Return Values

An `Async\Context` object.

## Examples

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Sees the value from the parent scope
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## See Also

- [coroutine_context()](/en/docs/reference/coroutine-context.html) — coroutine context
- [root_context()](/en/docs/reference/root-context.html) — global context
- [Context](/en/docs/components/context.html) — the context concept
