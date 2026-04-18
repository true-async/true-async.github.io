---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Get the number of values currently buffered in the thread channel."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Returns the current number of values held in the channel's buffer.

`ThreadChannel` implements the `Countable` interface, so you can use `count($channel)` as well.

For an unbuffered channel (`capacity = 0`), this always returns `0` — values are transferred
directly between threads without buffering.

The count is read atomically and is accurate at the moment of the call, even when other threads
are concurrently sending or receiving.

## Return values

The number of values currently in the buffer (`int`).

## Examples

### Example #1 Monitoring buffer fill level

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — Countable interface

$channel->recv();
echo $channel->count();   // 2
```

### Example #2 Logging channel load from a monitor thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Monitor thread: periodically logs buffer usage
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // In a real thread you'd use sleep() or a semaphore here
        }
    });

    // ... producer and consumer threads ...

    $tasks->close();
    await($monitor);
});
```

## See also

- [ThreadChannel::capacity](/en/docs/reference/thread-channel/capacity.html) — Channel capacity
- [ThreadChannel::isEmpty](/en/docs/reference/thread-channel/is-empty.html) — Check if the buffer is empty
- [ThreadChannel::isFull](/en/docs/reference/thread-channel/is-full.html) — Check if the buffer is full
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
