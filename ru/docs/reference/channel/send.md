---
layout: docs
lang: ru
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /ru/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Отправить значение в канал (блокирующая операция)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Отправляет значение в канал. Операция является блокирующей — текущая корутина приостанавливается,
если канал не может принять значение немедленно.

Для **канала-рандеву** (`capacity = 0`) отправитель ждёт, пока другая корутина не вызовет `recv()`.
Для **буферизованного канала** отправитель ждёт только тогда, когда буфер полон.

## Параметры

**value**
: Значение для отправки. Может быть любого типа.

**timeoutMs**
: Максимальное время ожидания в миллисекундах.
  `0` — ожидание без ограничения времени (по умолчанию).
  При превышении таймаута выбрасывается `TimeoutException`.

## Ошибки

- Выбрасывает `Async\ChannelException`, если канал закрыт.
- Выбрасывает `Async\TimeoutException`, если истёк таймаут.

## Примеры

### Пример #1 Отправка значений в канал

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('первое');  // помещается в буфер
    $channel->send('второе');  // ждёт освобождения места
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "первое"
    echo $channel->recv() . "\n"; // "второе"
});
```

### Пример #2 Отправка с таймаутом

```php
<?php

use Async\Channel;

$channel = new Channel(0); // рандеву

spawn(function() use ($channel) {
    try {
        $channel->send('данные', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Таймаут: никто не принял значение за 1 секунду\n";
    }
});
```

## См. также

- [Channel::sendAsync](/ru/docs/reference/channel/send-async.html) — Неблокирующая отправка
- [Channel::recv](/ru/docs/reference/channel/recv.html) — Получить значение из канала
- [Channel::isFull](/ru/docs/reference/channel/is-full.html) — Проверить, полон ли буфер
- [Channel::close](/ru/docs/reference/channel/close.html) — Закрыть канал
