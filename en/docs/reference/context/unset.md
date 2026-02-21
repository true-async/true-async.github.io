---
layout: docs
lang: en
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /en/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Remove a value by key from the context."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Removes a value by key from the current context. The removal only affects the local
context --- values in parent contexts are not changed.

The method returns the `Context` object, allowing method chaining.

## Parameters

**key**
: The key to remove. Can be a string or an object.

## Return Value

The `Context` object for method chaining.

## Examples

### Example #1 Removing a value from context

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Remove temporary data
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Example #2 Removing with an object key

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Remove sensitive data after use
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Example #3 Removal does not affect the parent context

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Child context sees value from parent
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Set a local value with the same key
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Remove the local value
    current_context()->unset('shared');

    // After removing local value — parent value is visible again through find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Example #4 Method chaining with unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Clear multiple keys with chaining
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## See Also

- [Context::set](/en/docs/reference/context/set.html) --- Set value in context
- [Context::find](/en/docs/reference/context/find.html) --- Find value by key
- [Context::findLocal](/en/docs/reference/context/find-local.html) --- Find value in local context
