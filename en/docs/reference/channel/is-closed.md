---
layout: docs
lang: en
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Check if the channel is closed."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Checks whether the channel has been closed by a `close()` call.

A closed channel does not accept new values via `send()`, but allows
reading remaining values from the buffer via `recv()`.

## Return values

`true` — the channel is closed.
`false` — the channel is open.

## Examples

### Example #1 Checking channel state

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "closed" : "open"; // "open"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "closed" : "open"; // "closed"

// You can still read the buffer even after closing
$value = $channel->recv(); // "data"
```

### Example #2 Conditional sending

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Channel closed, stopping sends\n";
});
```

## See also

- [Channel::close](/en/docs/reference/channel/close.html) — Close the channel
- [Channel::isEmpty](/en/docs/reference/channel/is-empty.html) — Check if the buffer is empty
