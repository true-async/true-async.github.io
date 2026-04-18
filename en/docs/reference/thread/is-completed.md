---
layout: docs
lang: en
path_key: "/docs/reference/thread/is-completed.html"
nav_active: docs
permalink: /en/docs/reference/thread/is-completed.html
page_title: "Thread::isCompleted"
description: "Check whether the thread has finished executing."
---

# Thread::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Thread::isCompleted(): bool
```

Returns `true` if the thread has finished executing — regardless of the reason: successful return of a value, throwing an exception, or cancellation. Once it transitions to `true`, the state will not change again.

## Return Value

`bool` — `true` if the thread is finished; `false` if it is still running.

## Examples

### Example #1 Non-blocking check before getResult()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        return "result";
    });

    // Yield control so the thread has time to finish
    suspend();

    if ($thread->isCompleted()) {
        echo "Result: " . $thread->getResult() . "\n";
    } else {
        echo "Thread has not finished yet\n";
    }
});
```

### Example #2 Waiting for multiple threads to complete

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $threads = [
        spawn_thread(fn() => heavyTask(1)),
        spawn_thread(fn() => heavyTask(2)),
        spawn_thread(fn() => heavyTask(3)),
    ];

    // Wait until all are finished
    do {
        suspend();
        $pending = array_filter($threads, fn($t) => !$t->isCompleted());
    } while (!empty($pending));

    foreach ($threads as $i => $thread) {
        echo "Thread $i: " . $thread->getResult() . "\n";
    }
});
```

## See Also

- [Thread::isRunning()](/en/docs/reference/thread/is-running.html) — Check if running
- [Thread::isCancelled()](/en/docs/reference/thread/is-cancelled.html) — Check cancellation
- [Thread::getResult()](/en/docs/reference/thread/get-result.html) — Get result
- [Thread::getException()](/en/docs/reference/thread/get-exception.html) — Get exception
- [Async\Thread](/en/docs/components/threads.html) — Thread component
