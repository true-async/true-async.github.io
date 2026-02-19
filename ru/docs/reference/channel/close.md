---
layout: docs
lang: ru
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /ru/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Закрыть канал для дальнейшей отправки данных."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Закрывает канал. После закрытия:

- Вызов `send()` выбрасывает `ChannelException`.
- Вызов `recv()` продолжает возвращать значения из буфера, пока он не опустеет.
  После этого `recv()` выбрасывает `ChannelException`.
- Все корутины, ожидающие в `send()` или `recv()`, получают `ChannelException`.
- Итерация через `foreach` завершается, когда буфер опустеет.

Повторный вызов `close()` на уже закрытом канале не вызывает ошибок.

## Примеры

### Пример #1 Закрытие канала после отправки данных

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // сигнал получателю, что данных больше не будет
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Получено: $value\n";
    }
    // foreach завершится после закрытия и опустошения буфера
    echo "Канал исчерпан\n";
});
```

### Пример #2 Обработка закрытия ожидающими корутинами

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('данные'); // ожидает получателя
    } catch (\Async\ChannelException $e) {
        echo "Канал закрыт: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // небольшая задержка
    $channel->close(); // разблокирует отправителя с исключением
});
```

## См. также

- [Channel::isClosed](/ru/docs/reference/channel/is-closed.html) — Проверить, закрыт ли канал
- [Channel::recv](/ru/docs/reference/channel/recv.html) — Получить значение (дочитывает буфер)
- [Channel::getIterator](/ru/docs/reference/channel/get-iterator.html) — Итерация до закрытия
