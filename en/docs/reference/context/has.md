---
layout: docs
lang: en
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /en/docs/reference/context/has.html
page_title: "Context::has"
description: "Check if a key exists in the current or parent context."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Checks whether a value with the specified key exists in the current context or in one
of the parent contexts. The search is performed up the hierarchy.

## Parameters

**key**
: The key to check. Can be a string or an object.

## Return Value

`true` if the key is found in the current or any parent context, `false` otherwise.

## Examples

### Example #1 Checking for a key before use

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale not set, using default\n";
    }
});
```

### Example #2 Checking with an object key

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Cache is available\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Example #3 Hierarchical check

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (from root)
        var_dump(current_context()->has('local_flag'));   // true (from parent)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## See Also

- [Context::find](/en/docs/reference/context/find.html) --- Find value by key
- [Context::get](/en/docs/reference/context/get.html) --- Get value (throws exception)
- [Context::hasLocal](/en/docs/reference/context/has-local.html) --- Check only in local context
