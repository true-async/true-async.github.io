---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Check whether the coroutine has completed."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Checks whether the coroutine has finished execution. A coroutine is considered completed on successful completion, on completion with an error, or on cancellation.

## Return Value

`bool` -- `true` if the coroutine has finished execution.

## Examples

### Example #1 Checking completion

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Example #2 Non-blocking readiness check

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Wait until all are completed
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## See Also

- [Coroutine::getResult](/en/docs/reference/coroutine/get-result.html) -- Get the result
- [Coroutine::getException](/en/docs/reference/coroutine/get-exception.html) -- Get the exception
- [Coroutine::isCancelled](/en/docs/reference/coroutine/is-cancelled.html) -- Check cancellation
