---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Get the local context of a coroutine."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Returns the local context of the coroutine. The context is created lazily on first access.

The context allows storing data bound to a specific coroutine and passing it to child coroutines.

## Return Value

`Async\Context` -- the coroutine's context object.

## Examples

### Example #1 Accessing the context

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## See Also

- [Context](/en/docs/components/context.html) -- Context concept
- [current_context()](/en/docs/reference/current-context.html) -- Get the current coroutine's context
