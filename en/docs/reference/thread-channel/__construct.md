---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Create a new thread-safe channel for exchanging data between OS threads."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Creates a new thread-safe channel for passing data between OS threads.

`ThreadChannel` is the cross-thread counterpart of [`Channel`](/en/docs/components/channels.html).
While `Channel` is designed for communication between coroutines within a single thread,
`ThreadChannel` allows data to flow safely between **separate OS threads** — for example, between
the main thread and a worker started with `spawn_thread()` or submitted to a `ThreadPool`.

The channel's behavior depends on the `$capacity` parameter:

- **`capacity = 0`** — unbuffered (synchronous) channel. `send()` blocks the calling thread
  until another thread calls `recv()`. This guarantees that the receiver is ready before the sender
  continues.
- **`capacity > 0`** — buffered channel. `send()` does not block as long as there is room in the
  buffer. When the buffer is full, the calling thread blocks until space becomes available.

All values transferred through the channel are **deep-copied** — the same serialization rules
apply as with `spawn_thread()`. Objects that cannot be serialized (e.g. closures, resources,
`stdClass` with references) will cause a `ThreadTransferException`.

## Parameters

**capacity**
: The capacity of the channel's internal buffer.
  `0` — unbuffered channel (default), `send()` blocks until a receiver is ready.
  Positive number — buffer size; `send()` blocks only when the buffer is full.

## Examples

### Example #1 Unbuffered channel between threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // blocks until main thread sends
        return "Worker received: $value";
    });

    $channel->send('hello'); // blocks until worker calls recv()
    echo await($thread), "\n";
});
```

### Example #2 Buffered channel between threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // buffer for 10 items

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // does not block until buffer is full
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## See also

- [ThreadChannel::send](/en/docs/reference/thread-channel/send.html) — Send a value to the channel
- [ThreadChannel::recv](/en/docs/reference/thread-channel/recv.html) — Receive a value from the channel
- [ThreadChannel::capacity](/en/docs/reference/thread-channel/capacity.html) — Get the channel capacity
- [ThreadChannel::close](/en/docs/reference/thread-channel/close.html) — Close the channel
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
