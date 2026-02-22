---
layout: docs
lang: uk
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /uk/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Відправити значення в канал (блокуюча операція)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Відправляє значення в канал. Це блокуюча операція — поточна корутина призупиняється,
якщо канал не може прийняти значення негайно.

Для **каналу рандеву** (`capacity = 0`) відправник чекає, доки інша корутина не викличе `recv()`.
Для **буферизованого каналу** відправник чекає лише тоді, коли буфер заповнений.

## Параметри

**value**
: Значення для відправлення. Може бути будь-якого типу.

**timeoutMs**
: Максимальний час очікування в мілісекундах.
  `0` — чекати нескінченно (за замовчуванням).
  Якщо тайм-аут перевищено, кидається `TimeoutException`.

## Помилки

- Кидає `Async\ChannelException`, якщо канал закрито.
- Кидає `Async\TimeoutException`, якщо тайм-аут вичерпано.

## Приклади

### Приклад #1 Відправлення значень у канал

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // розміщено в буфері
    $channel->send('second'); // чекає звільнення місця
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Приклад #2 Відправлення з тайм-аутом

```php
<?php

use Async\Channel;

$channel = new Channel(0); // рандеву

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Тайм-аут: ніхто не прийняв значення протягом 1 секунди\n";
    }
});
```

## Дивіться також

- [Channel::sendAsync](/uk/docs/reference/channel/send-async.html) — Неблокуюче відправлення
- [Channel::recv](/uk/docs/reference/channel/recv.html) — Отримати значення з каналу
- [Channel::isFull](/uk/docs/reference/channel/is-full.html) — Перевірити, чи буфер заповнений
- [Channel::close](/uk/docs/reference/channel/close.html) — Закрити канал
