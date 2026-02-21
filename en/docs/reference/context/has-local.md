---
layout: docs
lang: en
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /en/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Check if a key exists only in the local context."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Checks whether a value with the specified key exists **only** in the current (local) context.
Unlike `has()`, this method does not search in parent contexts.

## Parameters

**key**
: The key to check. Can be a string or an object.

## Return Value

`true` if the key is found in the local context, `false` otherwise.

## Examples

### Example #1 Difference between has and hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() searches up the hierarchy
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() checks only the current level
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Example #2 Checking with an object key

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Example #3 Conditional initialization of a local value

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Initialize value only if not set locally
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## See Also

- [Context::has](/en/docs/reference/context/has.html) --- Check with hierarchical traversal
- [Context::findLocal](/en/docs/reference/context/find-local.html) --- Find value in local context
- [Context::getLocal](/en/docs/reference/context/get-local.html) --- Get local value (throws exception)
