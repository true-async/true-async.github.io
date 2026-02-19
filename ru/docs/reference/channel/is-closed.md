---
layout: docs
lang: ru
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Проверить, закрыт ли канал."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Проверяет, был ли канал закрыт вызовом `close()`.

Закрытый канал не принимает новые значения через `send()`, но позволяет
дочитать оставшиеся значения из буфера через `recv()`.

## Возвращаемые значения

`true` — канал закрыт.
`false` — канал открыт.

## Примеры

### Пример #1 Проверка состояния канала

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "закрыт" : "открыт"; // "открыт"

$channel->send('данные');
$channel->close();

echo $channel->isClosed() ? "закрыт" : "открыт"; // "закрыт"

// Можно дочитать буфер даже после закрытия
$value = $channel->recv(); // "данные"
```

### Пример #2 Условная отправка

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Канал закрыт, прекращаю отправку\n";
});
```

## См. также

- [Channel::close](/ru/docs/reference/channel/close.html) — Закрыть канал
- [Channel::isEmpty](/ru/docs/reference/channel/is-empty.html) — Проверить, пуст ли буфер
