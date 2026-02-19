---
layout: docs
lang: ru
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /ru/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Получить значение из канала (блокирующая операция)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(int $timeoutMs = 0): mixed
```

Получает следующее значение из канала. Операция является блокирующей — текущая
корутина приостанавливается, если в канале нет доступных значений.

Если канал закрыт и буфер пуст, выбрасывается `ChannelException`.
Если канал закрыт, но в буфере остались значения, они будут возвращены.

## Параметры

**timeoutMs**
: Максимальное время ожидания в миллисекундах.
  `0` — ожидание без ограничения времени (по умолчанию).
  При превышении таймаута выбрасывается `TimeoutException`.

## Возвращаемые значения

Следующее значение из канала (`mixed`).

## Ошибки

- Выбрасывает `Async\ChannelException`, если канал закрыт и буфер пуст.
- Выбрасывает `Async\TimeoutException`, если истёк таймаут.

## Примеры

### Пример #1 Получение значений из канала

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Получено: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Канал закрыт и пуст\n";
    }
});
```

### Пример #2 Получение с таймаутом

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(timeoutMs: 2000);
        echo "Получено: $value\n";
    } catch (\Async\TimeoutException) {
        echo "Данные не поступили за 2 секунды\n";
    }
});
```

## См. также

- [Channel::recvAsync](/ru/docs/reference/channel/recv-async.html) — Неблокирующее получение
- [Channel::send](/ru/docs/reference/channel/send.html) — Отправить значение в канал
- [Channel::isEmpty](/ru/docs/reference/channel/is-empty.html) — Проверить, пуст ли буфер
- [Channel::getIterator](/ru/docs/reference/channel/get-iterator.html) — Итерация по каналу через foreach
