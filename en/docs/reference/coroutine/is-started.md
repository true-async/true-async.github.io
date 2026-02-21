---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Check whether the coroutine has been started by the scheduler."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Checks whether the coroutine has been started by the scheduler. A coroutine is considered started after the scheduler begins its execution.

## Return Value

`bool` -- `true` if the coroutine has been started.

## Examples

### Example #1 Checking before and after start

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- still in queue

suspend(); // let the scheduler start the coroutine

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- still true after completion
```

## See Also

- [Coroutine::isQueued](/en/docs/reference/coroutine/is-queued.html) -- Check queue status
- [Coroutine::isRunning](/en/docs/reference/coroutine/is-running.html) -- Check if currently running
- [Coroutine::isCompleted](/en/docs/reference/coroutine/is-completed.html) -- Check completion
