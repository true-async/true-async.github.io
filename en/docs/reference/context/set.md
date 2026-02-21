---
layout: docs
lang: en
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /en/docs/reference/context/set.html
page_title: "Context::set"
description: "Set a value in the context by key."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Sets a value in the current context with the specified key. By default, if the key
already exists, the value is **not overwritten**. To force overwriting, use
the `replace = true` parameter.

The method returns the `Context` object, allowing method chaining.

## Parameters

**key**
: The key to set the value for. Can be a string or an object.
  Object keys are useful for avoiding name conflicts between libraries.

**value**
: The value to store. Can be of any type.

**replace**
: If `false` (default) --- do not overwrite an existing value.
  If `true` --- overwrite the value even if the key already exists.

## Return Value

The `Context` object for method chaining.

## Examples

### Example #1 Setting values with string keys

```php
<?php

use function Async\current_context;

// Method chaining
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Example #2 Behavior without overwriting

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Setting again without replace — value does NOT change
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// With replace = true — value is overwritten
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Example #3 Object keys for library isolation

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Each library uses its own object key
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialized');
});
```

### Example #4 Passing context to child coroutines

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Parent context
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Child coroutines inherit values through find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Processing request: {$traceId}\n";

    // Child coroutine adds its own value
    current_context()->set('handler', 'user_controller');
});
```

## See Also

- [Context::unset](/en/docs/reference/context/unset.html) --- Remove value by key
- [Context::find](/en/docs/reference/context/find.html) --- Find value by key
- [Context::get](/en/docs/reference/context/get.html) --- Get value (throws exception)
- [current_context()](/en/docs/reference/current-context.html) --- Get the current Scope context
