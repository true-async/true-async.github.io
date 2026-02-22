---
layout: docs
lang: uk
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /uk/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Закрити канал для подальшого відправлення даних."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Закриває канал. Після закриття:

- Виклик `send()` кидає `ChannelException`.
- Виклик `recv()` продовжує повертати значення з буфера, доки він не спорожніє.
  Після цього `recv()` кидає `ChannelException`.
- Усі корутини, що очікують у `send()` або `recv()`, отримують `ChannelException`.
- Ітерація через `foreach` завершується, коли буфер спорожніє.

Повторний виклик `close()` на вже закритому каналі не спричиняє помилок.

## Приклади

### Приклад #1 Закриття каналу після відправлення даних

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // сигнал отримувачу, що більше даних не буде
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Отримано: $value\n";
    }
    // foreach завершується після закриття та вичерпання буфера
    echo "Канал вичерпано\n";
});
```

### Приклад #2 Обробка закриття корутинами, що очікують

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // очікування на отримувача
    } catch (\Async\ChannelException $e) {
        echo "Канал закрито: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // коротка затримка
    $channel->close(); // розблокує відправника з виключенням
});
```

## Дивіться також

- [Channel::isClosed](/uk/docs/reference/channel/is-closed.html) — Перевірити, чи канал закрито
- [Channel::recv](/uk/docs/reference/channel/recv.html) — Отримати значення (вичерпує буфер)
- [Channel::getIterator](/uk/docs/reference/channel/get-iterator.html) — Ітерація до закриття
