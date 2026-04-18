---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Close the thread channel, signalling that no further values will be sent."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Closes the channel. After closing:

- Calling `send()` throws a `ChannelClosedException`.
- Calling `recv()` continues to return values already in the buffer until it is drained.
  Once the buffer is empty, `recv()` throws a `ChannelClosedException`.
- Any threads currently blocked in `send()` or `recv()` are unblocked and receive a
  `ChannelClosedException`.

Calling `close()` on an already closed channel is a no-op — it does not throw.

`close()` is the standard way to signal "end of stream" to the consuming side. The producer
closes the channel after sending all items; the consumer reads until it catches
`ChannelClosedException`.

`close()` itself is thread-safe and can be called from any thread.

## Examples

### Example #1 Producer closes after sending all items

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // signals: no more data
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream ended\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Example #2 Close unblocks a waiting receiver

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // unbuffered

    // This thread will block in recv() waiting for a value
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // blocks
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // Close the channel from another thread — unblocks the waiter
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Example #3 Calling close() twice is safe

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // no-op, no exception thrown

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## See also

- [ThreadChannel::isClosed](/en/docs/reference/thread-channel/is-closed.html) — Check if the channel is closed
- [ThreadChannel::recv](/en/docs/reference/thread-channel/recv.html) — Receive remaining values after close
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
