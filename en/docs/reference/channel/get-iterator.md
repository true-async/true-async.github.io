---
layout: docs
lang: en
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /en/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Get an iterator to traverse channel values using foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Returns an iterator for traversing channel values. Channel implements
the `IteratorAggregate` interface, so you can use `foreach` directly.

The iterator suspends the current coroutine while waiting for the next value.
Iteration terminates when the channel is closed **and** the buffer is empty.

> **Important:** If the channel is never closed, `foreach` will wait for new values indefinitely.

## Return values

An `\Iterator` object for traversing channel values.

## Examples

### Example #1 Reading a channel with foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // without this, foreach will never terminate
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    echo "All values processed\n";
});
```

### Example #2 Producer-consumer pattern

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Producer
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consumer
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Downloaded: $url ({$response->status})\n";
    }
});
```

## See also

- [Channel::recv](/en/docs/reference/channel/recv.html) --- Receive a single value
- [Channel::close](/en/docs/reference/channel/close.html) --- Close the channel (terminates iteration)
- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) --- Check if the buffer is empty
