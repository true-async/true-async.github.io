---
layout: docs
lang: ru
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /ru/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Получить количество значений в буфере канала."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Возвращает текущее количество значений, находящихся в буфере канала.

Channel реализует интерфейс `Countable`, поэтому можно использовать `count($channel)`.

Для канала-рандеву (`capacity = 0`) всегда возвращает `0`.

## Возвращаемые значения

Количество значений в буфере (`int`).

## Примеры

### Пример #1 Мониторинг заполнения буфера

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Пример #2 Логирование нагрузки на канал

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Буфер заполнен на " . round($usage) . "%\n";
        delay(1000);
    }
});
```

## См. также

- [Channel::capacity](/ru/docs/reference/channel/capacity.html) --- Ёмкость канала
- [Channel::isEmpty](/ru/docs/reference/channel/is-empty.html) --- Проверить, пуст ли буфер
- [Channel::isFull](/ru/docs/reference/channel/is-full.html) --- Проверить, полон ли буфер
