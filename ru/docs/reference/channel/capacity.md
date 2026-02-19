---
layout: docs
lang: ru
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /ru/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Получить ёмкость буфера канала."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Возвращает ёмкость канала, заданную при создании через конструктор.

- `0` — канал-рандеву (unbuffered).
- Положительное число — максимальный размер буфера.

Значение не меняется в течение жизни канала.

## Возвращаемые значения

Ёмкость буфера канала (`int`).

## Примеры

### Пример #1 Проверка ёмкости

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Пример #2 Адаптивная логика в зависимости от типа канала

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Рандеву-канал: каждая отправка ждёт получателя\n";
    } else {
        echo "Буферизованный канал: ёмкость {$ch->capacity()}\n";
        echo "Свободно: " . ($ch->capacity() - $ch->count()) . " слотов\n";
    }
}
```

## См. также

- [Channel::__construct](/ru/docs/reference/channel/construct.html) — Создание канала
- [Channel::count](/ru/docs/reference/channel/count.html) — Количество значений в буфере
- [Channel::isFull](/ru/docs/reference/channel/is-full.html) — Проверить, полон ли буфер
