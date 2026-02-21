---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Get the result of coroutine execution."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Returns the result of the coroutine execution. If the coroutine has not yet completed, returns `null`.

**Important:** this method does not wait for the coroutine to complete. Use `await()` for waiting.

## Return Value

`mixed` -- the coroutine result or `null` if the coroutine has not yet completed.

## Examples

### Example #1 Basic usage

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// Before completion
var_dump($coroutine->getResult()); // NULL

// Wait for completion
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Example #2 Checking with isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // let the coroutine complete

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## See Also

- [Coroutine::getException](/en/docs/reference/coroutine/get-exception.html) -- Get the exception
- [Coroutine::isCompleted](/en/docs/reference/coroutine/is-completed.html) -- Check completion
- [await()](/en/docs/reference/await.html) -- Wait for the result
