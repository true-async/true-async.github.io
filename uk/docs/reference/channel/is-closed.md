---
layout: docs
lang: uk
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Перевірити, чи канал закрито."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Перевіряє, чи був канал закритий викликом `close()`.

Закритий канал не приймає нові значення через `send()`, але дозволяє
читати залишкові значення з буфера через `recv()`.

## Значення, що повертаються

`true` — канал закрито.
`false` — канал відкрито.

## Приклади

### Приклад #1 Перевірка стану каналу

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "closed" : "open"; // "open"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "closed" : "open"; // "closed"

// Можна читати буфер навіть після закриття
$value = $channel->recv(); // "data"
```

### Приклад #2 Умовне відправлення

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
    echo "Канал закрито, зупиняємо відправлення\n";
});
```

## Дивіться також

- [Channel::close](/uk/docs/reference/channel/close.html) — Закрити канал
- [Channel::isEmpty](/uk/docs/reference/channel/is-empty.html) — Перевірити, чи буфер порожній
