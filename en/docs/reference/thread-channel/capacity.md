---
layout: docs
lang: en
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /en/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Get the buffer capacity of the thread channel."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Returns the channel capacity set at construction time.

- `0` — unbuffered (synchronous) channel: `send()` blocks until the receiver is ready.
- Positive number — maximum number of values the buffer can hold simultaneously.

The capacity is fixed for the lifetime of the channel and does not change.

## Return values

The channel buffer capacity (`int`).

## Examples

### Example #1 Checking capacity

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Example #2 Adaptive logic based on channel type

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Unbuffered: each send() blocks until recv() is called\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Buffered: capacity {$ch->capacity()}, {$free} slot(s) free\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Buffered: capacity 8, 7 slot(s) free"
```

## See also

- [ThreadChannel::__construct](/en/docs/reference/thread-channel/__construct.html) — Create a channel
- [ThreadChannel::count](/en/docs/reference/thread-channel/count.html) — Number of values currently buffered
- [ThreadChannel::isFull](/en/docs/reference/thread-channel/is-full.html) — Check if the buffer is full
- [ThreadChannel component overview](/en/docs/components/thread-channels.html)
