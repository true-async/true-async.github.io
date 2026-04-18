---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Check whether the thread channel buffer is filled to its maximum capacity."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Returns `true` if the channel buffer has reached its maximum capacity.

For an unbuffered channel (`capacity = 0`), this always returns `true` because there
is no buffer — every `send()` must wait for a matching `recv()`.

`isFull()` is thread-safe. The result reflects the state at the moment of the call;
another thread may drain a slot immediately afterward.

## Return values

`true` — the buffer is at capacity (or it is an unbuffered channel).
`false` — the buffer has at least one free slot.

## Examples

### Example #1 Checking buffer fullness before sending

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Example #2 Back-pressure monitoring in a producer thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // Buffer is currently full — send() will block;
                // log back-pressure for observability
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // blocks until space is available
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Simulate slow consumer
                $val = $channel->recv();
                // process $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## See also

- [ThreadChannel::isEmpty](/en/docs/reference/thread-channel/is-empty.html) — Check if the buffer is empty
- [ThreadChannel::capacity](/en/docs/reference/thread-channel/capacity.html) — Channel capacity
- [ThreadChannel::count](/en/docs/reference/thread-channel/count.html) — Number of values in the buffer
- [ThreadChannel::send](/en/docs/reference/thread-channel/send.html) — Send a value (blocks when full)
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
