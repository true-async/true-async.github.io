---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Проверить, не содержит ли буфер поточного канала ни одного значения."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Возвращает `true`, если буфер канала не содержит ни одного значения.

Для небуферизованного канала (`capacity = 0`) всегда возвращает `true`, поскольку данные
передаются напрямую между потоками без буферизации.

`isEmpty()` является потокобезопасной. Результат отражает состояние на момент вызова;
другой поток может поместить значение в канал непосредственно после этого.

## Возвращаемые значения

`true` — буфер пуст (значений нет).
`false` — буфер содержит хотя бы одно значение.

## Примеры

### Пример #1 Проверка наличия буферизованных данных перед получением

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### Пример #2 Потребитель, опустошающий закрытый канал

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Ждём, пока есть что читать, или канал не закрыт
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Буфер временно пуст — повторяем попытку
                continue;
            }
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## Смотрите также

- [ThreadChannel::isFull](/ru/docs/reference/thread-channel/is-full.html) — Проверить, заполнен ли буфер
- [ThreadChannel::count](/ru/docs/reference/thread-channel/count.html) — Количество значений в буфере
- [ThreadChannel::recv](/ru/docs/reference/thread-channel/recv.html) — Получить значение
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
