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
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Receives the next value from the channel. This is a blocking operation — the current
coroutine is suspended if no values are available in the channel.

If the channel is closed and the buffer is empty, a `ChannelException` is thrown.
If the channel is closed but values remain in the buffer, they will be returned.

## Parameters

**cancellationToken**
: A cancellation token (`Completable`) that allows cancelling the wait on any condition.
  `null` — wait indefinitely (default).
  When the token completes, the operation is cancelled and a `CancelledException` is thrown.
  To limit by time, you can use `Async\timeout()`.

## Return values

The next value from the channel (`mixed`).

## Errors

- Throws `Async\ChannelException` if the channel is closed and the buffer is empty.
- Throws `Async\CancelledException` if the cancellation token has been completed.

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
        $value = $channel->recv(Async\timeout(2000));
        echo "Received: $value\n";
    } catch (\Async\CancelledException) {
        echo "No data received within 2 seconds\n";
    }
});
```

### Example #3 Receiving with a custom cancellation token

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Received: $value\n";
    } catch (\Async\CancelledException) {
        echo "Receive cancelled\n";
    }
});

// Cancel from another coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## See also

- [Channel::recvAsync](/en/docs/reference/channel/recv-async.html) — Non-blocking receive
- [Channel::send](/en/docs/reference/channel/send.html) — Send a value to the channel
- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) — Check if the buffer is empty
- [Channel::getIterator](/en/docs/reference/channel/get-iterator.html) — Iterate over the channel using foreach
