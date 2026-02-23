---
layout: docs
lang: uk
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /uk/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Отримати значення з каналу (блокуюча операція)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Отримує наступне значення з каналу. Це блокуюча операція — поточна
корутина призупиняється, якщо в каналі немає доступних значень.

Якщо канал закрито і буфер порожній, кидається `ChannelException`.
Якщо канал закрито, але в буфері залишилися значення, вони будуть повернуті.

## Параметри

**cancellationToken**
: Токен скасування (`Completable`), що дає змогу перервати очікування за довільною умовою.
  `null` — очікування без обмежень (за замовчуванням).
  Коли токен завершується, операція переривається і кидається `CancelledException`.
  Для обмеження за часом можна використовувати `Async\timeout()`.

## Значення, що повертаються

Наступне значення з каналу (`mixed`).

## Помилки

- Кидає `Async\ChannelException`, якщо канал закрито і буфер порожній.
- Кидає `Async\CancelledException`, якщо токен скасування було завершено.

## Приклади

### Приклад #1 Отримання значень з каналу

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Отримано: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Канал закрито та порожній\n";
    }
});
```

### Приклад #2 Отримання з тайм-аутом

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(Async\timeout(2000));
        echo "Отримано: $value\n";
    } catch (\Async\CancelledException) {
        echo "Дані не надійшли протягом 2 секунд\n";
    }
});
```

### Приклад #3 Отримання з довільним токеном скасування

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Отримано: $value\n";
    } catch (\Async\CancelledException) {
        echo "Отримання скасовано\n";
    }
});

// Скасовуємо з іншої корутини
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Дивіться також

- [Channel::recvAsync](/uk/docs/reference/channel/recv-async.html) — Неблокуюче отримання
- [Channel::send](/uk/docs/reference/channel/send.html) — Відправити значення в канал
- [Channel::isEmpty](/uk/docs/reference/channel/is-empty.html) — Перевірити, чи буфер порожній
- [Channel::getIterator](/uk/docs/reference/channel/get-iterator.html) — Ітерація по каналу за допомогою foreach
