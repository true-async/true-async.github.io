---
layout: docs
lang: en
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /en/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Receive a value from the channel (blocking operation)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(int $timeoutMs = 0): mixed
```

Receives the next value from the channel. This is a blocking operation — the current
coroutine is suspended if no values are available in the channel.

If the channel is closed and the buffer is empty, a `ChannelException` is thrown.
If the channel is closed but values remain in the buffer, they will be returned.

## Parameters

**timeoutMs**
: Maximum wait time in milliseconds.
  `0` — wait indefinitely (default).
  If the timeout is exceeded, a `TimeoutException` is thrown.

## Return values

The next value from the channel (`mixed`).

## Errors

- Throws `Async\ChannelException` if the channel is closed and the buffer is empty.
- Throws `Async\TimeoutException` if the timeout has expired.

## Examples

### Example #1 Receiving values from a channel

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Received: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Channel closed and empty\n";
    }
});
```

### Example #2 Receiving with a timeout

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(timeoutMs: 2000);
        echo "Received: $value\n";
    } catch (\Async\TimeoutException) {
        echo "No data received within 2 seconds\n";
    }
});
```

## See also

- [Channel::recvAsync](/en/docs/reference/channel/recv-async.html) — Non-blocking receive
- [Channel::send](/en/docs/reference/channel/send.html) — Send a value to the channel
- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) — Check if the buffer is empty
- [Channel::getIterator](/en/docs/reference/channel/get-iterator.html) — Iterate over the channel using foreach
