---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Закрыть поточный канал, сигнализируя об окончании отправки данных."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Закрывает канал. После закрытия:

- Вызов `send()` выбрасывает `ChannelClosedException`.
- Вызов `recv()` продолжает возвращать значения, находящиеся в буфере, до его опустошения.
  После того как буфер опустеет, `recv()` выбрасывает `ChannelClosedException`.
- Все потоки, заблокированные в `send()` или `recv()`, разблокируются и получают
  `ChannelClosedException`.

Вызов `close()` на уже закрытом канале — это холостая операция, исключение не выбрасывается.

`close()` — это стандартный способ сигнализировать потребляющей стороне о завершении потока данных.
Производитель закрывает канал после отправки всех элементов; потребитель читает данные до тех пор,
пока не поймает `ChannelClosedException`.

`close()` является потокобезопасной и может быть вызвана из любого потока.

## Примеры

### Пример #1 Производитель закрывает канал после отправки всех элементов

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // сигнал: данных больше не будет
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream ended\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Пример #2 Закрытие разблокирует ожидающего получателя

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // небуферизованный

    // Этот поток будет заблокирован в recv(), ожидая значение
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // блокируется
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // Закрываем канал из другого потока — разблокирует ожидающий поток
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Пример #3 Двойной вызов close() безопасен

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // холостая операция, исключение не выбрасывается

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## Смотрите также

- [ThreadChannel::isClosed](/ru/docs/reference/thread-channel/is-closed.html) — Проверить, закрыт ли канал
- [ThreadChannel::recv](/ru/docs/reference/thread-channel/recv.html) — Получить оставшиеся значения после закрытия
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
