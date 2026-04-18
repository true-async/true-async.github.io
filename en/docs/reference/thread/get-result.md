---
layout: docs
lang: en
path_key: "/docs/reference/thread/get-result.html"
nav_active: docs
permalink: /en/docs/reference/thread/get-result.html
page_title: "Thread::getResult"
description: "Get the result of thread execution."
---

# Thread::getResult

(PHP 8.6+, True Async 1.0)

```php
public Thread::getResult(): mixed
```

Returns the value returned by the thread function if the thread finished successfully. Returns `null` if the thread has not yet finished, finished with an exception, or was cancelled.

**Important:** this method does not throw exceptions and does not wait for the thread to finish. For blocking wait with exception propagation, use `await()`. To obtain an error, use `getException()`.

## Return Value

`mixed` — the result of the thread function, or `null`.

## Examples

### Example #1 Getting the result after isCompleted()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return array_sum(range(1, 1000));
    });

    // Wait for completion
    await($thread);

    if ($thread->isCompleted() && $thread->getException() === null) {
        echo "Result: " . $thread->getResult() . "\n"; // 500500
    }
});
```

### Example #2 Comparison with await()

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        return "data";
    });

    // Option 1: await() — waits and throws on error
    try {
        $result = await($thread);
        echo "await: $result\n";
    } catch (\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }

    // Option 2: getResult() — does not wait, does not throw
    $thread2 = spawn_thread(fn() => "other data");
    await($thread2);
    echo "getResult: " . $thread2->getResult() . "\n";
});
```

## See Also

- [Thread::getException()](/en/docs/reference/thread/get-exception.html) — Get exception
- [Thread::isCompleted()](/en/docs/reference/thread/is-completed.html) — Check completion
- [await()](/en/docs/reference/await.html) — Wait for result with exceptions
- [spawn_thread()](/en/docs/reference/spawn-thread.html) — Start a thread
- [Async\Thread](/en/docs/components/threads.html) — Thread component
