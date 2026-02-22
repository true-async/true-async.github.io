---
layout: docs
lang: uk
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /uk/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Неблокуюче відправлення значення в канал."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Виконує неблокуючу спробу відправити значення в канал.
На відміну від `send()`, цей метод **ніколи не призупиняє** корутину.

Повертає `true`, якщо значення було успішно відправлено (розміщено в буфері
або передано отримувачу, що очікує). Повертає `false`, якщо буфер заповнений
або канал закрито.

## Параметри

**value**
: Значення для відправлення. Може бути будь-якого типу.

## Значення, що повертаються

`true` — значення успішно відправлено.
`false` — канал заповнений або закритий, значення не відправлено.

## Приклади

### Приклад #1 Спроба неблокуючого відправлення

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — буфер порожній
$channel->sendAsync('b'); // true — є місце
$result = $channel->sendAsync('c'); // false — буфер заповнений

echo $result ? "Sent" : "Channel full"; // "Channel full"
```

### Приклад #2 Відправлення з перевіркою доступності

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Буфер заповнений — переходимо до блокуючого відправлення
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## Дивіться також

- [Channel::send](/uk/docs/reference/channel/send.html) — Блокуюче відправлення
- [Channel::isFull](/uk/docs/reference/channel/is-full.html) — Перевірити, чи буфер заповнений
- [Channel::isClosed](/uk/docs/reference/channel/is-closed.html) — Перевірити, чи канал закрито
