---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Отримати місткість буфера потокового каналу."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Повертає місткість каналу, задану під час конструювання.

- `0` — небуферизований (синхронний) канал: `send()` блокує до готовності отримувача.
- Додатне число — максимальна кількість значень, які буфер може зберігати одночасно.

Місткість є фіксованою протягом усього часу існування каналу і не змінюється.

## Значення, що повертається

Місткість буфера каналу (`int`).

## Приклади

### Приклад #1 Перевірка місткості

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Приклад #2 Адаптивна логіка на основі типу каналу

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

## Дивіться також

- [ThreadChannel::__construct](/uk/docs/reference/thread-channel/__construct.html) — Створити канал
- [ThreadChannel::count](/uk/docs/reference/thread-channel/count.html) — Кількість значень, що зараз буферизовані
- [ThreadChannel::isFull](/uk/docs/reference/thread-channel/is-full.html) — Перевірити, чи заповнений буфер
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
