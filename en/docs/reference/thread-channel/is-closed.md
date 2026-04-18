---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Check whether the thread channel has been closed."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Returns `true` if the channel has been closed via `close()`.

A closed channel does not accept new values through `send()`, but `recv()` continues
to return any values remaining in the buffer until it is drained.

`isClosed()` is thread-safe and can be called from any thread without synchronization.

## Return values

`true` — the channel is closed.
`false` — the channel is open.

## Examples

### Example #1 Checking channel state from the main thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // Values buffered before close are still readable
    echo $channel->recv(), "\n"; // "data"
});
```

### Example #2 Consumer loop guarded by isClosed()

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Keep reading until closed AND buffer is empty
        while (!$channel->isClosed() || !$channel->isEmpty()) {
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

- [ThreadChannel::close](/en/docs/reference/thread-channel/close.html) — Close the channel
- [ThreadChannel::isEmpty](/en/docs/reference/thread-channel/is-empty.html) — Check if the buffer is empty
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
