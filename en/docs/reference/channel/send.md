---
layout: docs
lang: en
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /en/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Send a value to the channel (blocking operation)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Sends a value to the channel. This is a blocking operation — the current coroutine is suspended
if the channel cannot accept the value immediately.

For a **rendezvous channel** (`capacity = 0`), the sender waits until another coroutine calls `recv()`.
For a **buffered channel**, the sender waits only when the buffer is full.

## Parameters

**value**
: The value to send. Can be of any type.

**timeoutMs**
: Maximum wait time in milliseconds.
  `0` — wait indefinitely (default).
  If the timeout is exceeded, a `TimeoutException` is thrown.

## Errors

- Throws `Async\ChannelException` if the channel is closed.
- Throws `Async\TimeoutException` if the timeout has expired.

## Examples

### Example #1 Sending values to a channel

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // placed in the buffer
    $channel->send('second'); // waits for space to free up
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Example #2 Sending with a timeout

```php
<?php

use Async\Channel;

$channel = new Channel(0); // rendezvous

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Timeout: no one accepted the value within 1 second\n";
    }
});
```

## See also

- [Channel::sendAsync](/en/docs/reference/channel/send-async.html) — Non-blocking send
- [Channel::recv](/en/docs/reference/channel/recv.html) — Receive a value from the channel
- [Channel::isFull](/en/docs/reference/channel/is-full.html) — Check if the buffer is full
- [Channel::close](/en/docs/reference/channel/close.html) — Close the channel
