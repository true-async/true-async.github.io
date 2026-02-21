---
layout: docs
lang: en
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /en/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Non-blocking receive of a value from the channel, returns a Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Performs a non-blocking receive of a value from the channel and returns a `Future` object
that can be awaited later.

Unlike `recv()`, this method **does not suspend** the current coroutine immediately.
Instead, a `Future` is returned that will be resolved when a value becomes available.

## Return values

A `Future` object that will resolve with the received value from the channel.

## Examples

### Example #1 Non-blocking receive

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Can perform other work while data is not yet needed
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Example #2 Parallel receive from multiple channels

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Wait for the first available value from any channel
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Received from channel #$index: $result\n";
});
```

## See also

- [Channel::recv](/en/docs/reference/channel/recv.html) — Blocking receive
- [Channel::sendAsync](/en/docs/reference/channel/send-async.html) — Non-blocking send
- [await](/en/docs/reference/await.html) — Await a Future
