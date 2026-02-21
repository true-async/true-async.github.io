---
layout: docs
lang: en
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /en/docs/components/context.html
page_title: "Context"
description: "Context in TrueAsync -- storing data in scope hierarchy, local and inherited values, analogous to Go context.Context."
---

# Context: Execution Contexts

## Why This is Needed

There is an `API` with a service class that needs to perform actions tied to an authorization token.
However, passing the token to every method of the service is a bad idea.
In `PHP`, this problem is solved through global variables or static class properties.
But in an asynchronous environment, where a single process can handle different requests, this approach won't work,
because at the time of the call, it's unknown which request is being handled.

`Async\Context` allows storing data associated with a coroutine or `Scope` and building application logic
based on the execution context.

## What is Context

`Async\Context` is a key-value store bound to a `Scope` or coroutine.
Contexts form a hierarchy: when reading a value, the search goes up the scope tree.

This is analogous to `context.Context` in `Go` or `CoroutineContext` in `Kotlin`.
A mechanism for passing data through the hierarchy without explicitly passing parameters.

## Three Levels of Context

`TrueAsync` provides three functions for accessing contexts:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Context of the current Scope
$scopeCtx = current_context();

// Context of the current coroutine
$coroCtx = coroutine_context();

// Global root context
$rootCtx = root_context();
?>
```

### current_context()

Returns the context of the current `Scope`. If the context hasn't been created yet, it creates one automatically.
Values set here are visible to all coroutines in this Scope.

### coroutine_context()

Returns the context of the current coroutine. This is a **private** context belonging only to this coroutine.
Other coroutines cannot see data set here.

### root_context()

Returns the global context, shared across the entire request. Values here are visible via `find()` from any context.

## Keys

A key can be a **string** or an **object**:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// String key
$ctx->set('request_id', 'abc-123');

// Object as key (useful for unique tokens)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Object keys are stored by reference in the context, which guarantees their uniqueness.

## Reading: Local and Hierarchical

### find() / get() / has() -- Hierarchical Search

Searches for a value first in the current context, then in the parent, and so on up to the root:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() searches up the hierarchy
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- found in root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Current Context Only

Searches for a value **only** in the current context, without going up the hierarchy:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- this value is not set in the current Scope

$inherited = current_context()->find('app_name');
// "MyApp" -- found in parent scope
?>
```

## Writing and Deleting

### set()

```php
<?php
$ctx = current_context();

// Set a value (default replace = false)
$ctx->set('key', 'value');

// Repeated set without replace -- error
$ctx->set('key', 'new_value'); // Error: A context key already exists

// With explicit replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

The `set()` method returns `$this`, allowing method chaining:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

The `unset()` method also returns `$this`.

## Practical Examples

### Passing a Request ID

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Middleware sets the request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Any coroutine in this scope can read it
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Use in logging
    error_log("[$requestId] Processing request...");
});
?>
```

### Coroutine Context as Private Storage

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... perform work
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Cannot see 'step' from c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Configuration via root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Set at the beginning of the request
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Available from any coroutine
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## See Also

- [Scope](/en/docs/components/scope.html) -- managing coroutine lifetimes
- [Coroutines](/en/docs/components/coroutines.html) -- the basic unit of concurrency
- [current_context()](/en/docs/reference/current-context.html) -- getting the current Scope's context
