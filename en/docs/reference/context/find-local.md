---
layout: docs
lang: en
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /en/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Find a value only in the local context (without searching parent contexts)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Searches for a value by key **only** in the current (local) context. Unlike `find()`,
this method does not search up the hierarchy of parent contexts.

Returns `null` if the key is not found at the current level.

## Parameters

**key**
: The key to search for. Can be a string or an object.

## Return Value

The value associated with the key in the local context, or `null` if the key is not found.

## Examples

### Example #1 Difference between find and findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() searches up the hierarchy
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() searches only at the current level
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Example #2 Using with an object key

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // Object key from parent is not visible through findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Example #3 Overriding a parent value

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Check if the value is overridden locally
    if (current_context()->findLocal('timeout') === null) {
        // Use inherited value, but can override
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## See Also

- [Context::find](/en/docs/reference/context/find.html) --- Search with hierarchical traversal
- [Context::getLocal](/en/docs/reference/context/get-local.html) --- Get local value (throws exception)
- [Context::hasLocal](/en/docs/reference/context/has-local.html) --- Check key in local context
