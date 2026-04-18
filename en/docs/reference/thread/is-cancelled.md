---
layout: docs
lang: en
path_key: "/docs/reference/thread/is-cancelled.html"
nav_active: docs
permalink: /en/docs/reference/thread/is-cancelled.html
page_title: "Thread::isCancelled"
description: "Check whether the thread was cancelled."
---

# Thread::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Thread::isCancelled(): bool
```

Returns `true` if the thread was cancelled via `cancel()` and has actually finished executing. A cancelled thread is also considered completed: `isCancelled() === true` implies `isCompleted() === true`.

## Return Value

`bool` — `true` if the thread was cancelled; `false` otherwise.

## Examples

### Example #1 Distinguishing cancellation from normal completion

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(10);
        return "will never be returned";
    });

    $thread->cancel();
    await($thread);

    if ($thread->isCancelled()) {
        echo "Thread was cancelled\n";
    } elseif ($thread->getException() !== null) {
        echo "Thread finished with an error\n";
    } else {
        echo "Thread finished successfully: " . $thread->getResult() . "\n";
    }
});
```

### Example #2 Checking cancellation while polling state

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(5);
    });

    // Cancel after the first loop iteration
    $thread->cancel();

    while (!$thread->isCompleted()) {
        suspend();
    }

    echo $thread->isCancelled()
        ? "Thread stopped by cancellation request\n"
        : "Thread finished on its own\n";
});
```

## See Also

- [Thread::cancel()](/en/docs/reference/thread/cancel.html) — Request cancellation
- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [Async\Thread](/en/docs/components/threads.html) — Thread component
