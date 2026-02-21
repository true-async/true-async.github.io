---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Check whether the coroutine is currently executing."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Checks whether the coroutine is currently executing. A coroutine is considered running if it has been started and has not yet completed.

## Return Value

`bool` -- `true` if the coroutine is running and not completed.

## Examples

### Example #1 Checking execution state

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // Inside the coroutine isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// Outside -- coroutine is suspended or not yet started
var_dump($coroutine->isRunning()); // bool(false)
```

## See Also

- [Coroutine::isStarted](/en/docs/reference/coroutine/is-started.html) -- Check if started
- [Coroutine::isSuspended](/en/docs/reference/coroutine/is-suspended.html) -- Check suspension
- [Coroutine::isCompleted](/en/docs/reference/coroutine/is-completed.html) -- Check completion
