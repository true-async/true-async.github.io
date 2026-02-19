---
layout: docs
lang: ru
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /ru/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Неблокирующая отправка значения в канал."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Выполняет неблокирующую попытку отправить значение в канал.
В отличие от `send()`, этот метод **никогда не приостанавливает** корутину.

Возвращает `true`, если значение было успешно отправлено (помещено в буфер
или передано ожидающему получателю). Возвращает `false`, если буфер полон
или канал закрыт.

## Параметры

**value**
: Значение для отправки. Может быть любого типа.

## Возвращаемые значения

`true` — значение успешно отправлено.
`false` — канал полон или закрыт, значение не отправлено.

## Примеры

### Пример #1 Попытка неблокирующей отправки

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — буфер пуст
$channel->sendAsync('b'); // true — место есть
$result = $channel->sendAsync('c'); // false — буфер полон

echo $result ? "Отправлено" : "Канал полон"; // "Канал полон"
```

### Пример #2 Отправка с проверкой доступности

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Буфер полон — переключимся на блокирующую отправку
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## См. также

- [Channel::send](/ru/docs/reference/channel/send.html) — Блокирующая отправка
- [Channel::isFull](/ru/docs/reference/channel/is-full.html) — Проверить, полон ли буфер
- [Channel::isClosed](/ru/docs/reference/channel/is-closed.html) — Проверить, закрыт ли канал
