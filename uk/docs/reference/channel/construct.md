---
layout: docs
lang: uk
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /uk/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Створити новий канал для обміну даними між корутинами."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Створює новий канал для передачі даних між корутинами.

Канал — це примітив синхронізації, який дозволяє корутинам безпечно обмінюватися даними.
Поведінка каналу залежить від параметра `$capacity`:

- **`capacity = 0`** — канал рандеву (без буфера). Операція `send()` призупиняє відправника,
  доки інша корутина не викличе `recv()`. Це забезпечує синхронну передачу даних.
- **`capacity > 0`** — буферизований канал. Операція `send()` не блокується, доки є місце в буфері.
  Коли буфер заповнений, відправник призупиняється, доки не звільниться місце.

## Параметри

**capacity**
: Ємність внутрішнього буфера каналу.
  `0` — канал рандеву (за замовчуванням), відправлення блокується до отримання.
  Додатне число — розмір буфера.

## Приклади

### Приклад #1 Канал рандеву (без буфера)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // призупиняється, доки хтось не викличе recv()
    echo "Відправлено\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // отримує 'hello', розблокує відправника
    echo "Отримано: $value\n";
});
```

### Приклад #2 Буферизований канал

```php
<?php

use Async\Channel;

$channel = new Channel(3); // буфер на 3 елементи

spawn(function() use ($channel) {
    $channel->send(1); // не блокується — буфер порожній
    $channel->send(2); // не блокується — є місце
    $channel->send(3); // не блокується — останній слот
    $channel->send(4); // призупиняється — буфер заповнений
});
```

## Дивіться також

- [Channel::send](/uk/docs/reference/channel/send.html) — Відправити значення в канал
- [Channel::recv](/uk/docs/reference/channel/recv.html) — Отримати значення з каналу
- [Channel::capacity](/uk/docs/reference/channel/capacity.html) — Отримати ємність каналу
- [Channel::close](/uk/docs/reference/channel/close.html) — Закрити канал
