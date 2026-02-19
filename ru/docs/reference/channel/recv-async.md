---
layout: docs
lang: ru
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /ru/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Неблокирующее получение значения из канала, возвращает Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Выполняет неблокирующее получение значения из канала и возвращает объект `Future`,
который можно дождаться позже.

В отличие от `recv()`, этот метод **не приостанавливает** текущую корутину немедленно.
Вместо этого возвращается `Future`, который будет разрешён, когда значение станет доступным.

## Возвращаемые значения

Объект `Future`, который разрешится полученным значением из канала.

## Примеры

### Пример #1 Неблокирующее получение

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('данные A');
    $channel->send('данные B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Можно выполнять другую работу, пока данные не понадобятся
    doSomeWork();

    echo await($futureA) . "\n"; // "данные A"
    echo await($futureB) . "\n"; // "данные B"
});
```

### Пример #2 Параллельное получение из нескольких каналов

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Ожидаем первое доступное значение из любого канала
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Получено из канала #$index: $result\n";
});
```

## См. также

- [Channel::recv](/ru/docs/reference/channel/recv.html) — Блокирующее получение
- [Channel::sendAsync](/ru/docs/reference/channel/send-async.html) — Неблокирующая отправка
- [await](/ru/docs/reference/await.html) — Ожидание Future
