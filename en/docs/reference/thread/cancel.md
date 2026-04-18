---
layout: docs
lang: en
path_key: "/docs/reference/thread/cancel.html"
nav_active: docs
permalink: /en/docs/reference/thread/cancel.html
page_title: "Thread::cancel"
description: "Request cancellation of a thread."
---

# Thread::cancel

(PHP 8.6+, True Async 1.0)

```php
public Thread::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Requests cancellation of the thread. Cancellation is **cooperative** — the thread is not interrupted immediately. It must react to the cancellation request on its own: for example, through coroutine suspension points inside the thread or by explicitly checking the cancellation state.

Once the thread has actually stopped, `isCancelled()` will return `true`.

## Parameters

**cancellation**
: The cancellation reason object. If `null`, a default `AsyncCancellation` is created.

## Examples

### Example #1 Cancelling a long-running thread

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        // Thread performs a lengthy task
        for ($i = 0; $i < 100; $i++) {
            sleep(1);
            // Here the thread could check the cancellation flag
        }
        return "done";
    });

    // Cancel after some time
    \Async\delay(2);
    $thread->cancel();

    await($thread);

    echo $thread->isCancelled()
        ? "Thread successfully cancelled\n"
        : "Thread finished before cancellation\n";
});
```

### Example #2 Cancellation with a reason

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        sleep(60);
    });

    $thread->cancel(new \Async\AsyncCancellation("Operation timeout exceeded"));

    await($thread);

    if ($thread->isCancelled()) {
        echo "Thread cancelled\n";
    }
});
```

### Example #3 Cancelling multiple threads

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $threads = array_map(
        fn($i) => spawn_thread(fn() => sleep(30)),
        range(1, 5)
    );

    // Cancel all at once
    foreach ($threads as $thread) {
        $thread->cancel();
    }

    foreach ($threads as $i => $thread) {
        await($thread);
        echo "Thread $i cancelled: " . ($thread->isCancelled() ? 'yes' : 'no') . "\n";
    }
});
```

## See Also

- [Thread::isCancelled()](/en/docs/reference/thread/is-cancelled.html) — Check cancellation
- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [Async\Thread](/en/docs/components/threads.html) — Thread component
