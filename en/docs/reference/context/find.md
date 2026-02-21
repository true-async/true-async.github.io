---
layout: docs
lang: en
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /en/docs/reference/context/find.html
page_title: "Context::find"
description: "Find a value by key in the current or parent context."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Searches for a value by key in the current context. If the key is not found, the search continues
up the hierarchy of parent contexts. Returns `null` if the value is not found at any level.

This is a safe search method: it never throws an exception when a key is missing.

## Parameters

**key**
: The key to search for. Can be a string or an object.
  When using an object as a key, the search is performed by object reference.

## Return Value

The value associated with the key, or `null` if the key is not found in the current
or any parent context.

## Examples

### Example #1 Searching for a value by string key

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Child coroutine finds value from parent context
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Searching for a non-existent key returns null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Example #2 Searching for a value by object key

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Search by object key reference
    $logger = current_context()->find($loggerKey);
    $logger->info('Message from child coroutine');
});
```

### Example #3 Hierarchical search

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Root level
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Level 1: add own value
    current_context()->set('user_id', 42);

    spawn(function() {
        // Level 2: search for values from all levels
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## See Also

- [Context::get](/en/docs/reference/context/get.html) --- Get value (throws exception if missing)
- [Context::has](/en/docs/reference/context/has.html) --- Check if key exists
- [Context::findLocal](/en/docs/reference/context/find-local.html) --- Search only in local context
- [Context::set](/en/docs/reference/context/set.html) --- Set value in context
