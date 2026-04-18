---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Проверить, был ли закрыт поточный канал."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Возвращает `true`, если канал был закрыт посредством `close()`.

Закрытый канал не принимает новые значения через `send()`, однако `recv()` продолжает
возвращать значения, оставшиеся в буфере, до полного его опустошения.

`isClosed()` является потокобезопасной и может вызываться из любого потока без синхронизации.

## Возвращаемые значения

`true` — канал закрыт.
`false` — канал открыт.

## Примеры

### Пример #1 Проверка состояния канала из главного потока

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // Значения, буферизованные до закрытия, по-прежнему доступны для чтения
    echo $channel->recv(), "\n"; // "data"
});
```

### Пример #2 Цикл потребителя с проверкой isClosed()

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Читаем до закрытия канала И опустошения буфера
        while (!$channel->isClosed() || !$channel->isEmpty()) {
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

- [ThreadChannel::close](/ru/docs/reference/thread-channel/close.html) — Закрыть канал
- [ThreadChannel::isEmpty](/ru/docs/reference/thread-channel/is-empty.html) — Проверить, пуст ли буфер
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
