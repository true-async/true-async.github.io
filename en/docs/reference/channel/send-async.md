---
layout: docs
lang: en
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /en/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Non-blocking send of a value to the channel."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Performs a non-blocking attempt to send a value to the channel.
Unlike `send()`, this method **never suspends** the coroutine.

Returns `true` if the value was successfully sent (placed in the buffer
or delivered to a waiting receiver). Returns `false` if the buffer is full
or the channel is closed.

## Parameters

**value**
: The value to send. Can be of any type.

## Return values

`true` — the value was successfully sent.
`false` — the channel is full or closed, the value was not sent.

## Examples

### Example #1 Attempting a non-blocking send

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — buffer is empty
$channel->sendAsync('b'); // true — space available
$result = $channel->sendAsync('c'); // false — buffer is full

echo $result ? "Sent" : "Channel full"; // "Channel full"
```

### Example #2 Sending with availability check

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Buffer is full — fall back to blocking send
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## See also

- [Channel::send](/en/docs/reference/channel/send.html) — Blocking send
- [Channel::isFull](/en/docs/reference/channel/is-full.html) — Check if the buffer is full
- [Channel::isClosed](/en/docs/reference/channel/is-closed.html) — Check if the channel is closed
