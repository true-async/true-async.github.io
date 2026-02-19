---
layout: docs
lang: ru
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /ru/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Проверить, полон ли буфер канала."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Проверяет, заполнен ли буфер канала до максимальной ёмкости.

Для канала-рандеву (`capacity = 0`) всегда возвращает `true`,
так как буфер отсутствует.

## Возвращаемые значения

`true` — буфер полон (или канал-рандеву).
`false` — в буфере есть свободное место.

## Примеры

### Пример #1 Проверка заполненности буфера

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "полон" : "есть место"; // "есть место"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "полон" : "есть место"; // "полон"
```

### Пример #2 Адаптивная скорость отправки

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Буфер полон, замедляю обработку\n";
        }
        $channel->send($line); // приостановится если полон
    }
    $channel->close();
});
```

## См. также

- [Channel::isEmpty](/ru/docs/reference/channel/is-empty.html) --- Проверить, пуст ли буфер
- [Channel::capacity](/ru/docs/reference/channel/capacity.html) --- Ёмкость канала
- [Channel::count](/ru/docs/reference/channel/count.html) --- Количество значений в буфере
- [Channel::sendAsync](/ru/docs/reference/channel/send-async.html) --- Неблокирующая отправка
