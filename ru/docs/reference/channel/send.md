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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Отправляет значение в канал. Операция является блокирующей — текущая корутина приостанавливается,
если канал не может принять значение немедленно.

Для **канала-рандеву** (`capacity = 0`) отправитель ждёт, пока другая корутина не вызовет `recv()`.
Для **буферизованного канала** отправитель ждёт только тогда, когда буфер полон.

## Параметры

**value**
: Значение для отправки. Может быть любого типа.

**cancellationToken**
: Токен отмены (`Completable`), позволяющий прервать ожидание по произвольному условию.
  `null` — ожидание без ограничений (по умолчанию).
  Когда токен завершается, операция прерывается и выбрасывается `CancelledException`.
  Для ограничения по времени можно использовать `Async\timeout()`.

## Ошибки

- Выбрасывает `Async\ChannelException`, если канал закрыт.
- Выбрасывает `Async\CancelledException`, если токен отмены был завершён.

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
        $channel->send('данные', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Таймаут: никто не принял значение за 1 секунду\n";
    }
});
```

### Пример #3 Отправка с произвольным токеном отмены

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('данные', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "Отправка отменена\n";
    }
});

// Отменяем операцию из другой корутины
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## См. также

- [Channel::sendAsync](/ru/docs/reference/channel/send-async.html) — Неблокирующая отправка
- [Channel::recv](/ru/docs/reference/channel/recv.html) — Получить значение из канала
- [Channel::isFull](/ru/docs/reference/channel/is-full.html) — Проверить, полон ли буфер
- [Channel::close](/ru/docs/reference/channel/close.html) — Закрыть канал
