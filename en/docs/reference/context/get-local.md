---
layout: docs
lang: en
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /en/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Get a value only from the local context. Throws an exception if not found."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Gets a value by key **only** from the current (local) context.
Unlike `get()`, this method does not search in parent contexts.

If the key is not found at the current level, it throws an exception.

## Parameters

**key**
: The key to search for. Can be a string or an object.

## Return Value

The value associated with the key in the local context.

## Errors

- Throws `Async\ContextException` if the key is not found in the local context.

## Examples

### Example #1 Getting a local value

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Value is set locally — getLocal works
    $taskId = current_context()->getLocal('task_id');
    echo "Task: {$taskId}\n"; // "Task: 42"
});
```

### Example #2 Exception when accessing an inherited key

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() would find the value in the parent
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() throws an exception — value is not in the local context
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Not found locally: " . $e->getMessage() . "\n";
    }
});
```

### Example #3 Using with an object key

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "User: " . $session['user'] . "\n"; // "User: admin"
});
```

## See Also

- [Context::get](/en/docs/reference/context/get.html) --- Get value with hierarchical search
- [Context::findLocal](/en/docs/reference/context/find-local.html) --- Safe search in local context
- [Context::hasLocal](/en/docs/reference/context/has-local.html) --- Check key in local context
