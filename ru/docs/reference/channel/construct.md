---
layout: docs
lang: ru
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /ru/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Создание нового канала для обмена данными между корутинами."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Создаёт новый канал для передачи данных между корутинами.

Канал — это примитив синхронизации, позволяющий корутинам безопасно обмениваться данными.
Поведение канала зависит от параметра `$capacity`:

- **`capacity = 0`** — канал-рандеву (unbuffered). Операция `send()` приостанавливает отправителя
  до тех пор, пока другая корутина не вызовет `recv()`. Это обеспечивает синхронную передачу данных.
- **`capacity > 0`** — буферизованный канал. Операция `send()` не блокирует, пока в буфере есть место.
  Когда буфер заполнен, отправитель приостанавливается до освобождения места.

## Параметры

**capacity**
: Ёмкость внутреннего буфера канала.
  `0` — канал-рандеву (по умолчанию), отправка блокирует до получения.
  Положительное число — размер буфера.

## Примеры

### Пример #1 Канал-рандеву (unbuffered)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('привет'); // приостановится, пока кто-то не вызовет recv()
    echo "Отправлено\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // получит 'привет', разблокирует отправителя
    echo "Получено: $value\n";
});
```

### Пример #2 Буферизованный канал

```php
<?php

use Async\Channel;

$channel = new Channel(3); // буфер на 3 элемента

spawn(function() use ($channel) {
    $channel->send(1); // не блокирует — буфер пуст
    $channel->send(2); // не блокирует — место есть
    $channel->send(3); // не блокирует — последний слот
    $channel->send(4); // приостановится — буфер полон
});
```

## См. также

- [Channel::send](/ru/docs/reference/channel/send.html) — Отправить значение в канал
- [Channel::recv](/ru/docs/reference/channel/recv.html) — Получить значение из канала
- [Channel::capacity](/ru/docs/reference/channel/capacity.html) — Узнать ёмкость канала
- [Channel::close](/ru/docs/reference/channel/close.html) — Закрыть канал
