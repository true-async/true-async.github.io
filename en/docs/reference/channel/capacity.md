---
layout: docs
lang: en
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /en/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Get the channel buffer capacity."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Returns the channel capacity set at creation time via the constructor.

- `0` — rendezvous channel (unbuffered).
- Positive number — maximum buffer size.

The value does not change during the channel's lifetime.

## Return values

The channel buffer capacity (`int`).

## Examples

### Example #1 Checking capacity

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Example #2 Adaptive logic based on channel type

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Rendezvous channel: each send waits for a receiver\n";
    } else {
        echo "Buffered channel: capacity {$ch->capacity()}\n";
        echo "Free: " . ($ch->capacity() - $ch->count()) . " slots\n";
    }
}
```

## See also

- [Channel::__construct](/en/docs/reference/channel/construct.html) — Create a channel
- [Channel::count](/en/docs/reference/channel/count.html) — Number of values in the buffer
- [Channel::isFull](/en/docs/reference/channel/is-full.html) — Check if the buffer is full
