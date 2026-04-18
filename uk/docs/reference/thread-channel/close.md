---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Закрити потоковий канал, сигналізуючи, що більше жодних значень надіслано не буде."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Закриває канал. Після закриття:

- Виклик `send()` кидає `ChannelClosedException`.
- Виклик `recv()` продовжує повертати значення, що вже знаходяться в буфері, поки він не буде спустошений.
  Як тільки буфер порожній, `recv()` кидає `ChannelClosedException`.
- Будь-які потоки, заблоковані в `send()` або `recv()`, розблоковуються і отримують
  `ChannelClosedException`.

Виклик `close()` на вже закритому каналі є порожньою операцією — він не кидає виняток.

`close()` — це стандартний спосіб сигналізувати «кінець потоку» для сторони-споживача. Виробник
закриває канал після надсилання всіх елементів; споживач читає до тих пір, поки не перехопить
`ChannelClosedException`.

`close()` є потокобезпечним і може бути викликаний із будь-якого потоку.

## Приклади

### Приклад #1 Виробник закриває канал після надсилання всіх елементів

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
        $channel->close(); // сигнал: більше даних немає
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

### Приклад #2 Close розблоковує очікуючого отримувача

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // небуферизований

    // Цей потік блокуватиметься в recv(), очікуючи значення
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // блокує
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // Закриваємо канал з іншого потоку — розблоковує очікувача
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Приклад #3 Подвійний виклик close() є безпечним

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // порожня операція, виняток не кидається

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## Дивіться також

- [ThreadChannel::isClosed](/uk/docs/reference/thread-channel/is-closed.html) — Перевірити, чи закритий канал
- [ThreadChannel::recv](/uk/docs/reference/thread-channel/recv.html) — Отримати значення, що залишились після закриття
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
