---
layout: docs
lang: uk
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /uk/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Неблокуюче отримання значення з каналу, повертає Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Виконує неблокуюче отримання значення з каналу та повертає об'єкт `Future`,
який можна очікувати пізніше.

На відміну від `recv()`, цей метод **не призупиняє** поточну корутину одразу.
Натомість повертається `Future`, який буде вирішено, коли значення стане доступним.

## Значення, що повертаються

Об'єкт `Future`, який буде вирішено з отриманим значенням з каналу.

## Приклади

### Приклад #1 Неблокуюче отримання

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Можна виконувати іншу роботу, поки дані ще не потрібні
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Приклад #2 Паралельне отримання з кількох каналів

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Чекаємо на перше доступне значення з будь-якого каналу
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Отримано з каналу #$index: $result\n";
});
```

## Дивіться також

- [Channel::recv](/uk/docs/reference/channel/recv.html) — Блокуюче отримання
- [Channel::sendAsync](/uk/docs/reference/channel/send-async.html) — Неблокуюче відправлення
- [await](/uk/docs/reference/await.html) — Очікування Future
