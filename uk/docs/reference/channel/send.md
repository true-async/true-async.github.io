---
layout: docs
lang: uk
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /uk/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Відправити значення в канал (блокуюча операція)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Відправляє значення в канал. Це блокуюча операція — поточна корутина призупиняється,
якщо канал не може прийняти значення негайно.

Для **каналу рандеву** (`capacity = 0`) відправник чекає, доки інша корутина не викличе `recv()`.
Для **буферизованого каналу** відправник чекає лише тоді, коли буфер заповнений.

## Параметри

**value**
: Значення для відправлення. Може бути будь-якого типу.

**cancellationToken**
: Токен скасування (`Completable`), що дає змогу перервати очікування за довільною умовою.
  `null` — очікування без обмежень (за замовчуванням).
  Коли токен завершується, операція переривається і кидається `CancelledException`.
  Для обмеження за часом можна використовувати `Async\timeout()`.

## Помилки

- Кидає `Async\ChannelException`, якщо канал закрито.
- Кидає `Async\CancelledException`, якщо токен скасування було завершено.

## Приклади

### Приклад #1 Відправлення значень у канал

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // розміщено в буфері
    $channel->send('second'); // чекає звільнення місця
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Приклад #2 Відправлення з тайм-аутом

```php
<?php

use Async\Channel;

$channel = new Channel(0); // рандеву

spawn(function() use ($channel) {
    try {
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Тайм-аут: ніхто не прийняв значення протягом 1 секунди\n";
    }
});
```

### Приклад #3 Відправлення з довільним токеном скасування

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('data', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "Відправлення скасовано\n";
    }
});

// Скасовуємо операцію з іншої корутини
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Дивіться також

- [Channel::sendAsync](/uk/docs/reference/channel/send-async.html) — Неблокуюче відправлення
- [Channel::recv](/uk/docs/reference/channel/recv.html) — Отримати значення з каналу
- [Channel::isFull](/uk/docs/reference/channel/is-full.html) — Перевірити, чи буфер заповнений
- [Channel::close](/uk/docs/reference/channel/close.html) — Закрити канал
