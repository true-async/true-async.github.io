---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Register a handler to be called when the coroutine completes."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Registers a callback function that will be called when the coroutine completes, regardless of the outcome (success, error, or cancellation).

If the coroutine has already completed at the time `finally()` is called, the callback will execute immediately.

Multiple handlers can be registered -- they execute in the order they were added.

## Parameters

**callback**
: The handler function. Receives the coroutine object as an argument.

## Examples

### Example #1 Basic usage

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### Example #2 Resource cleanup

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### Example #3 Multiple handlers

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### Example #4 Registration after completion

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// Coroutine already completed -- callback executes immediately
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## See Also

- [Coroutine::isCompleted](/en/docs/reference/coroutine/is-completed.html) -- Check completion
- [Coroutine::getResult](/en/docs/reference/coroutine/get-result.html) -- Get the result
