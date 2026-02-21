---
layout: docs
lang: en
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /en/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Check if the channel buffer is full."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Checks whether the channel buffer is filled to its maximum capacity.

For a rendezvous channel (`capacity = 0`), this always returns `true`,
since there is no buffer.

## Return values

`true` — the buffer is full (or it is a rendezvous channel).
`false` — the buffer has free space.

## Examples

### Example #1 Checking buffer fullness

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Example #2 Adaptive send rate

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Buffer full, slowing down processing\n";
        }
        $channel->send($line); // suspends if full
    }
    $channel->close();
});
```

## See also

- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) --- Check if the buffer is empty
- [Channel::capacity](/en/docs/reference/channel/capacity.html) --- Channel capacity
- [Channel::count](/en/docs/reference/channel/count.html) --- Number of values in the buffer
- [Channel::sendAsync](/en/docs/reference/channel/send-async.html) --- Non-blocking send
