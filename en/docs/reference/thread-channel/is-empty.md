---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Check whether the thread channel buffer currently holds no values."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Returns `true` if the channel buffer contains no values.

For an unbuffered channel (`capacity = 0`), this always returns `true` because data
is transferred directly between threads without buffering.

`isEmpty()` is thread-safe. The result reflects the state at the moment of the call;
another thread may place a value into the channel immediately afterward.

## Return values

`true` — the buffer is empty (no values available).
`false` — the buffer contains at least one value.

## Examples

### Example #1 Checking for buffered data before receiving

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### Example #2 Consumer that drains a closed channel

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Wait until there is something to read, or the channel closes
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Buffer momentarily empty — yield and retry
                continue;
            }
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## See also

- [ThreadChannel::isFull](/en/docs/reference/thread-channel/is-full.html) — Check if the buffer is full
- [ThreadChannel::count](/en/docs/reference/thread-channel/count.html) — Number of values in the buffer
- [ThreadChannel::recv](/en/docs/reference/thread-channel/recv.html) — Receive a value
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
