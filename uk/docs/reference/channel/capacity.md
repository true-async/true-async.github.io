---
layout: docs
lang: uk
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /uk/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Отримати ємність буфера каналу."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Повертає ємність каналу, встановлену під час створення через конструктор.

- `0` — канал рандеву (без буфера).
- Додатне число — максимальний розмір буфера.

Значення не змінюється протягом усього часу існування каналу.

## Значення, що повертаються

Ємність буфера каналу (`int`).

## Приклади

### Приклад #1 Перевірка ємності

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Приклад #2 Адаптивна логіка залежно від типу каналу

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Канал рандеву: кожне відправлення чекає на отримувача\n";
    } else {
        echo "Буферизований канал: ємність {$ch->capacity()}\n";
        echo "Вільно: " . ($ch->capacity() - $ch->count()) . " слотів\n";
    }
}
```

## Дивіться також

- [Channel::__construct](/uk/docs/reference/channel/construct.html) — Створити канал
- [Channel::count](/uk/docs/reference/channel/count.html) — Кількість значень у буфері
- [Channel::isFull](/uk/docs/reference/channel/is-full.html) — Перевірити, чи буфер заповнений
