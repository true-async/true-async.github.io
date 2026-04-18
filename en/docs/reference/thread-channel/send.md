---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Send a value to the thread channel, blocking the calling thread if the channel cannot accept it immediately."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Sends a value to the channel. This is a **blocking** operation — the calling thread is blocked
if the channel cannot accept the value immediately.

- For an **unbuffered channel** (`capacity = 0`), the thread blocks until another thread calls `recv()`.
- For a **buffered channel**, the thread blocks only when the buffer is full, and unblocks as soon
  as a receiver drains a slot.

Unlike `Channel::send()` (which suspends a coroutine), `ThreadChannel::send()` blocks the
entire OS thread. Design your architecture accordingly — for example, keep the sending thread
free to block, or use a buffered channel to reduce contention.

The value is **deep-copied** before being placed into the channel. Closures, resources, and
non-serializable objects will cause a `ThreadTransferException`.

## Parameters

**value**
: The value to send. Can be of any serializable type (scalar, array, or a serializable object).

## Errors

- Throws `Async\ChannelClosedException` if the channel is already closed.
- Throws `Async\ThreadTransferException` if the value cannot be serialized for cross-thread transfer.

## Examples

### Example #1 Sending results from a worker thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### Example #2 Unbuffered handshake between threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // unbuffered
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // blocks until request arrives
        $responses->send(strtoupper($req));   // blocks until response is accepted
    });

    $requests->send('hello');                 // blocks until server calls recv()
    $reply = $responses->recv();              // blocks until server calls send()
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Example #3 Handling a closed channel

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Send failed: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## See also

- [ThreadChannel::recv](/en/docs/reference/thread-channel/recv.html) — Receive a value from the channel
- [ThreadChannel::isFull](/en/docs/reference/thread-channel/is-full.html) — Check if the buffer is full
- [ThreadChannel::close](/en/docs/reference/thread-channel/close.html) — Close the channel
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
