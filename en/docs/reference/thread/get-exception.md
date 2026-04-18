---
layout: docs
lang: en
path_key: "/docs/reference/thread/get-exception.html"
nav_active: docs
permalink: /en/docs/reference/thread/get-exception.html
page_title: "Thread::getException"
description: "Get the exception with which the thread finished."
---

# Thread::getException

(PHP 8.6+, True Async 1.0)

```php
public Thread::getException(): mixed
```

Returns an `Async\RemoteException` if the thread finished with an exception. Returns `null` if the thread has not yet finished, finished successfully, or was cancelled.

`RemoteException` is a wrapper around the original exception from the child thread. Use the `getRemoteException()` and `getRemoteClass()` methods of the `RemoteException` object to access the details of the original error.

## Return Value

`Async\RemoteException|null` — a wrapper around the thread's exception, or `null`.

## Examples

### Example #1 Distinguishing successful completion from an error

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new \RuntimeException("Error in thread");
    });

    await($thread);

    if ($thread->isCompleted()) {
        $exception = $thread->getException();

        if ($exception !== null) {
            echo "Thread finished with error: " . $exception->getMessage() . "\n";
            echo "Original class: " . $exception->getRemoteClass() . "\n";
        } else {
            echo "Result: " . $thread->getResult() . "\n";
        }
    }
});
```

### Example #2 Handling RemoteException without await()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\suspend;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new \InvalidArgumentException("Invalid argument");
    });

    // Wait for completion without propagating the exception
    while (!$thread->isCompleted()) {
        suspend();
    }

    $exc = $thread->getException();
    if ($exc instanceof \Async\RemoteException) {
        echo "Original exception class: " . $exc->getRemoteClass() . "\n";
        echo "Message: " . $exc->getMessage() . "\n";
    }
});
```

## See Also

- [Thread::getResult()](/en/docs/reference/thread/get-result.html) — Get result
- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [await()](/en/docs/reference/await.html) — Wait with exception propagation
- [Async\Thread](/en/docs/components/threads.html) — Thread component
