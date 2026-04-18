---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Receive the next value from the thread channel, blocking the calling thread if no value is available."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Receives the next value from the channel. This is a **blocking** operation — the calling thread
is blocked if no values are currently available in the channel.

- For a **buffered channel**, `recv()` returns immediately if the buffer contains at least one value.
  If the buffer is empty, the thread blocks until a sender places a value.
- For an **unbuffered channel** (`capacity = 0`), `recv()` blocks until another thread calls `send()`.

If the channel is closed and the buffer still contains values, those values are returned normally.
Once the buffer is drained and the channel is closed, `recv()` throws `ChannelClosedException`.

The received value is a **deep copy** of the original — modifications to the returned value do
not affect the sender's copy.

## Return values

The next value from the channel (`mixed`).

## Errors

- Throws `Async\ChannelClosedException` if the channel is closed and the buffer is empty.

## Examples

### Example #1 Receiving values produced by a worker thread

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
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Receive all values — blocks when buffer is empty
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "All values received\n";
    }

    await($worker);
});
```

### Example #2 Consumer thread draining a shared channel

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Producer: fills the channel from one thread
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Consumer: drains the channel from another thread
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // buffer drained and channel closed
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Example #3 Receiving from an unbuffered channel

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // unbuffered

    $sender = spawn_thread(function() use ($channel) {
        // Blocks here until the main thread calls recv()
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // Main coroutine (thread) calls recv() — unblocks the sender
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## See also

- [ThreadChannel::send](/en/docs/reference/thread-channel/send.html) — Send a value to the channel
- [ThreadChannel::isEmpty](/en/docs/reference/thread-channel/is-empty.html) — Check if the buffer is empty
- [ThreadChannel::close](/en/docs/reference/thread-channel/close.html) — Close the channel
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
