---
layout: docs
lang: en
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /en/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Get the number of values in the channel buffer."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Returns the current number of values in the channel buffer.

Channel implements the `Countable` interface, so you can use `count($channel)`.

For a rendezvous channel (`capacity = 0`), this always returns `0`.

## Return values

The number of values in the buffer (`int`).

## Examples

### Example #1 Monitoring buffer fill level

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Example #2 Logging channel load

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Buffer is " . round($usage) . "% full\n";
        delay(1000);
    }
});
```

## See also

- [Channel::capacity](/en/docs/reference/channel/capacity.html) --- Channel capacity
- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) --- Check if the buffer is empty
- [Channel::isFull](/en/docs/reference/channel/is-full.html) --- Check if the buffer is full
