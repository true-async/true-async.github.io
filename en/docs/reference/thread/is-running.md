---
layout: docs
lang: en
path_key: "/docs/reference/thread/is-running.html"
nav_active: docs
permalink: /en/docs/reference/thread/is-running.html
page_title: "Thread::isRunning"
description: "Check whether the thread is currently running."
---

# Thread::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Thread::isRunning(): bool
```

Returns `true` if the thread has been started and has not yet finished executing. Returns `false` if the thread has already finished — successfully, with an exception, or cancelled.

## Return Value

`bool` — `true` if the thread is running; `false` if it has finished.

## Examples

### Example #1 Checking state while waiting

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        // simulate long-running work
        sleep(1);
        return "done";
    });

    var_dump($thread->isRunning()); // bool(true)

    await($thread);

    var_dump($thread->isRunning()); // bool(false)
});
```

### Example #2 Polling state in a loop

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(2);
        return 42;
    });

    while ($thread->isRunning()) {
        echo "Thread is still running...\n";
        suspend(); // yield control to the scheduler
    }

    echo "Thread finished. Result: " . $thread->getResult() . "\n";
});
```

## See Also

- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [Thread::isCancelled()](/en/docs/reference/thread/is-cancelled.html) — Check cancellation
- [Async\Thread](/en/docs/components/threads.html) — Thread component
