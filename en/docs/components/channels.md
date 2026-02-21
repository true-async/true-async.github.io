---
layout: docs
lang: en
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /en/docs/components/channels.html
page_title: "Channels"
description: "Channels in TrueAsync -- safe data transfer between coroutines, task queues, and backpressure."
---

# Channels

Channels are more useful for communication in a multithreaded environment
than in a single-threaded one. They serve for safe data transfer from one coroutine to another.
If you need to modify shared data,
in a single-threaded environment it's simpler to pass an object to different coroutines than to create a channel.

However, channels are useful in the following scenarios:
* organizing a task queue with limits
* organizing object pools (it's recommended to use the dedicated `Async\Pool` primitive)
* synchronization

For example, there are many URLs to crawl, but no more than N connections simultaneously:

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Fetched page {$url}, length: " . strlen($content) . "\n";
        }
    });
}

// Fill the channel with values
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

The `MAX_QUEUE` constant in this example acts as a limiter for the producer, creating backpressure --
a situation where the producer cannot send data until the consumer frees up space in the channel.

## Unbuffered Channel (Rendezvous)

A channel with buffer size `0` works in rendezvous mode: `send()` blocks until another coroutine calls `recv()`, and vice versa. This ensures strict synchronization:

```php
use Async\Channel;

$ch = new Channel(0); // Rendezvous channel

spawn(function() use ($ch) {
    echo "Sender: before send\n";
    $ch->send("hello");
    echo "Sender: send completed\n"; // Only after recv()
});

spawn(function() use ($ch) {
    echo "Receiver: before recv\n";
    $value = $ch->recv();
    echo "Receiver: got $value\n";
});
```

## Timeouts on Operations

The `recv()` and `send()` methods accept an optional timeout parameter in milliseconds. When the time expires, a `TimeoutException` is thrown:

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Wait no more than 50 ms
    } catch (TimeoutException $e) {
        echo "Nobody sent data within 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Wait for receiver no more than 50 ms
    } catch (TimeoutException $e) {
        echo "Nobody received the data within 50 ms\n";
    }
});
```

## Competing Receivers

If multiple coroutines are waiting on `recv()` on the same channel, each value is received by **only one** of them. Values are not duplicated:

```php
use Async\Channel;

$ch = new Channel(0);

// Sender
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Receiver A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Receiver B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Each value (1, 2, 3) will be received by only A or B, but not both
```

This pattern is useful for implementing worker pools, where multiple coroutines compete for tasks from a shared queue.
