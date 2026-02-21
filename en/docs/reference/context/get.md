---
layout: docs
lang: en
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /en/docs/reference/context/get.html
page_title: "Context::get"
description: "Get a value from context. Throws an exception if the key is not found."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Gets a value by key from the current context. If the key is not found at the current level,
the search continues up the hierarchy of parent contexts.

Unlike `find()`, this method throws an exception if the key is not found at any level.
Use `get()` when the presence of a value is a mandatory requirement.

## Parameters

**key**
: The key to search for. Can be a string or an object.
  When using an object as a key, the search is performed by object reference.

## Return Value

The value associated with the key.

## Errors

- Throws `Async\ContextException` if the key is not found in the current
  or any parent context.

## Examples

### Example #1 Getting a required value

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Get a value that must exist
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Example #2 Handling a missing key

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Key not found: " . $e->getMessage() . "\n";
}
```

### Example #3 Using an object key

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // Object key ensures uniqueness without name conflicts
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## See Also

- [Context::find](/en/docs/reference/context/find.html) --- Safe search (returns null)
- [Context::has](/en/docs/reference/context/has.html) --- Check if key exists
- [Context::getLocal](/en/docs/reference/context/get-local.html) --- Get value only from local context
- [Context::set](/en/docs/reference/context/set.html) --- Set value in context
