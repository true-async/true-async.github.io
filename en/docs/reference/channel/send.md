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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Sends a value to the channel. This is a blocking operation — the current coroutine is suspended
if the channel cannot accept the value immediately.

For a **rendezvous channel** (`capacity = 0`), the sender waits until another coroutine calls `recv()`.
For a **buffered channel**, the sender waits only when the buffer is full.

## Parameters

**value**
: The value to send. Can be of any type.

**cancellationToken**
: A cancellation token (`Completable`) that allows cancelling the wait on any condition.
  `null` — wait indefinitely (default).
  When the token completes, the operation is cancelled and a `CancelledException` is thrown.
  To limit by time, you can use `Async\timeout()`.

## Errors

- Throws `Async\ChannelException` if the channel is closed.
- Throws `Async\CancelledException` if the cancellation token has been completed.

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
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Timeout: no one accepted the value within 1 second\n";
    }
});
```

### Example #3 Sending with a custom cancellation token

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('data', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "Send cancelled\n";
    }
});

// Cancel the operation from another coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## See also

- [Channel::sendAsync](/en/docs/reference/channel/send-async.html) — Non-blocking send
- [Channel::recv](/en/docs/reference/channel/recv.html) — Receive a value from the channel
- [Channel::isFull](/en/docs/reference/channel/is-full.html) — Check if the buffer is full
- [Channel::close](/en/docs/reference/channel/close.html) — Close the channel
