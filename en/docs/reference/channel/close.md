---
layout: docs
lang: en
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /en/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Close the channel for further data sending."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Closes the channel. After closing:

- Calling `send()` throws a `ChannelException`.
- Calling `recv()` continues to return values from the buffer until it is empty.
  After that, `recv()` throws a `ChannelException`.
- All coroutines waiting in `send()` or `recv()` receive a `ChannelException`.
- Iteration via `foreach` terminates when the buffer is empty.

Calling `close()` again on an already closed channel does not cause errors.

## Examples

### Example #1 Closing a channel after sending data

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // signal to the receiver that no more data will come
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    // foreach terminates after closing and draining the buffer
    echo "Channel exhausted\n";
});
```

### Example #2 Handling closure by waiting coroutines

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // waiting for a receiver
    } catch (\Async\ChannelException $e) {
        echo "Channel closed: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // short delay
    $channel->close(); // unblocks the sender with an exception
});
```

## See also

- [Channel::isClosed](/en/docs/reference/channel/is-closed.html) — Check if the channel is closed
- [Channel::recv](/en/docs/reference/channel/recv.html) — Receive a value (drains the buffer)
- [Channel::getIterator](/en/docs/reference/channel/get-iterator.html) — Iterate until closed
