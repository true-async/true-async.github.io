---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Получить ёмкость буфера поточного канала."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Возвращает ёмкость канала, заданную при создании.

- `0` — небуферизованный (синхронный) канал: `send()` блокируется до готовности получателя.
- Положительное число — максимальное количество значений, которые буфер может хранить одновременно.

Ёмкость фиксирована на протяжении всего времени жизни канала и не изменяется.

## Возвращаемые значения

Ёмкость буфера канала (`int`).

## Примеры

### Пример #1 Проверка ёмкости

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Пример #2 Адаптивная логика на основе типа канала

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Unbuffered: each send() blocks until recv() is called\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Buffered: capacity {$ch->capacity()}, {$free} slot(s) free\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Buffered: capacity 8, 7 slot(s) free"
```

## Смотрите также

- [ThreadChannel::__construct](/ru/docs/reference/thread-channel/__construct.html) — Создать канал
- [ThreadChannel::count](/ru/docs/reference/thread-channel/count.html) — Количество значений в буфере
- [ThreadChannel::isFull](/ru/docs/reference/thread-channel/is-full.html) — Проверить, заполнен ли буфер
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
