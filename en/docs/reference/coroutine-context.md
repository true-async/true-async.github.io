---
layout: docs
lang: en
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /en/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — get the private context of the current coroutine."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Returns the `Async\Context` object bound to the current coroutine.

## Description

```php
coroutine_context(): Async\Context
```

Returns the **private** context of the current coroutine. Data set here is not visible to other coroutines. If the context for the coroutine has not been created yet, it is created automatically.

## Return Values

An `Async\Context` object.

## Examples

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Later in the same coroutine
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Cannot see 'step' from another coroutine
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## See Also

- [current_context()](/en/docs/reference/current-context.html) — Scope context
- [root_context()](/en/docs/reference/root-context.html) — global context
- [Context](/en/docs/components/context.html) — the context concept
