---
layout: docs
lang: en
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /en/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Create a new channel for exchanging data between coroutines."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Creates a new channel for passing data between coroutines.

A channel is a synchronization primitive that allows coroutines to safely exchange data.
The channel's behavior depends on the `$capacity` parameter:

- **`capacity = 0`** — rendezvous channel (unbuffered). The `send()` operation suspends the sender
  until another coroutine calls `recv()`. This ensures synchronous data transfer.
- **`capacity > 0`** — buffered channel. The `send()` operation does not block as long as there is room in the buffer.
  When the buffer is full, the sender is suspended until space becomes available.

## Parameters

**capacity**
: The capacity of the channel's internal buffer.
  `0` — rendezvous channel (default), send blocks until receive.
  Positive number — buffer size.

## Examples

### Example #1 Rendezvous channel (unbuffered)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // suspends until someone calls recv()
    echo "Sent\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // receives 'hello', unblocks the sender
    echo "Received: $value\n";
});
```

### Example #2 Buffered channel

```php
<?php

use Async\Channel;

$channel = new Channel(3); // buffer for 3 elements

spawn(function() use ($channel) {
    $channel->send(1); // does not block — buffer is empty
    $channel->send(2); // does not block — space available
    $channel->send(3); // does not block — last slot
    $channel->send(4); // suspends — buffer is full
});
```

## See also

- [Channel::send](/en/docs/reference/channel/send.html) — Send a value to the channel
- [Channel::recv](/en/docs/reference/channel/recv.html) — Receive a value from the channel
- [Channel::capacity](/en/docs/reference/channel/capacity.html) — Get the channel capacity
- [Channel::close](/en/docs/reference/channel/close.html) — Close the channel
