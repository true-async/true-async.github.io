---
layout: docs
lang: en
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /en/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Check if the channel buffer is empty."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Checks whether the channel buffer is empty (no values available for receiving).

For a rendezvous channel (`capacity = 0`), this always returns `true`,
since data is transferred directly without buffering.

## Return values

`true` — the buffer is empty.
`false` — the buffer contains values.

## Examples

### Example #1 Checking for available data

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"
```

### Example #2 Batch data processing

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // wait for data to arrive
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## See also

- [Channel::isFull](/en/docs/reference/channel/is-full.html) --- Check if the buffer is full
- [Channel::count](/en/docs/reference/channel/count.html) --- Number of values in the buffer
- [Channel::recv](/en/docs/reference/channel/recv.html) --- Receive a value
