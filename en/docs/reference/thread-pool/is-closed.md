---
layout: docs
lang: en
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Check whether the thread pool has been shut down."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Returns `true` if the pool has been shut down via [`close()`](/en/docs/reference/thread-pool/close.html) or [`cancel()`](/en/docs/reference/thread-pool/cancel.html). Returns `false` while the pool is still accepting tasks.

## Return Value

`bool` — `true` if the pool is closed; `false` if it is still active.

## Examples

### Example #1 Checking state before submitting

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### Example #2 Guarding submit in shared contexts

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## See Also

- [ThreadPool::close()](/en/docs/reference/thread-pool/close.html) — graceful shutdown
- [ThreadPool::cancel()](/en/docs/reference/thread-pool/cancel.html) — hard shutdown
- [Async\ThreadPool](/en/docs/components/thread-pool.html) — component overview
