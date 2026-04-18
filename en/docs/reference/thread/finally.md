---
layout: docs
lang: en
path_key: "/docs/reference/thread/finally.html"
nav_active: docs
permalink: /en/docs/reference/thread/finally.html
page_title: "Thread::finally"
description: "Register a callback on thread completion."
---

# Thread::finally

(PHP 8.6+, True Async 1.0)

```php
public Thread::finally(\Closure $callback): void
```

Registers a callback function that will be executed when the thread finishes — regardless of whether it completed successfully, with an exception, or was cancelled.

The callback is executed in the **coroutine scheduler of the parent thread**. Multiple callbacks may be registered; they are called in registration order. The callback takes no arguments — to obtain the result or exception, use `getResult()` / `getException()` inside it.

## Parameters

**callback**
: A function with no parameters, called when the thread finishes.

## Examples

### Example #1 Releasing a resource after thread completion

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;

spawn(function() {
    $resource = acquireResource();

    $thread = spawn_thread(function() use ($resource) {
        // work with the resource in the thread
        return processData($resource);
    });

    $thread->finally(function() use ($resource, $thread) {
        releaseResource($resource);
        echo "Resource released. Thread cancelled: "
            . ($thread->isCancelled() ? 'yes' : 'no') . "\n";
    });
});
```

### Example #2 Logging thread result

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return array_sum(range(1, 100));
    });

    $thread->finally(function() use ($thread) {
        if ($thread->isCancelled()) {
            echo "[log] Thread cancelled\n";
        } elseif ($thread->getException() !== null) {
            echo "[log] Thread finished with error: "
                . $thread->getException()->getMessage() . "\n";
        } else {
            echo "[log] Thread finished. Result: "
                . $thread->getResult() . "\n";
        }
    });

    await($thread);
});
```

### Example #3 Multiple callbacks

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(fn() => "result");

    $thread->finally(function() { echo "First callback\n"; });
    $thread->finally(function() { echo "Second callback\n"; });
    $thread->finally(function() { echo "Third callback\n"; });

    await($thread);
    // Output:
    // First callback
    // Second callback
    // Third callback
});
```

## See Also

- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [Thread::getResult()](/en/docs/reference/thread/get-result.html) — Get result
- [Thread::getException()](/en/docs/reference/thread/get-exception.html) — Get exception
- [Thread::isCancelled()](/en/docs/reference/thread/is-cancelled.html) — Check cancellation
- [Async\Thread](/en/docs/components/threads.html) — Thread component
