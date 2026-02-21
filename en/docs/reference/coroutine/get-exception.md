---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Get the exception that occurred in a coroutine."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Returns the exception that occurred in the coroutine. If the coroutine completed successfully or has not yet completed, returns `null`. If the coroutine was cancelled, returns an `AsyncCancellation` object.

## Return Value

`mixed` -- the exception or `null`.

- `null` -- if the coroutine has not completed or completed successfully
- `Throwable` -- if the coroutine completed with an error
- `AsyncCancellation` -- if the coroutine was cancelled

## Errors

Throws `RuntimeException` if the coroutine is currently running.

## Examples

### Example #1 Successful completion

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Example #2 Completion with error

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Caught during await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### Example #3 Cancelled coroutine

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## See Also

- [Coroutine::getResult](/en/docs/reference/coroutine/get-result.html) -- Get the result
- [Coroutine::isCancelled](/en/docs/reference/coroutine/is-cancelled.html) -- Check cancellation
- [Exceptions](/en/docs/components/exceptions.html) -- Error handling
