---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Перевірити, чи закритий потоковий канал."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Повертає `true`, якщо канал був закритий через `close()`.

Закритий канал не приймає нових значень через `send()`, але `recv()` продовжує
повертати значення, що залишились у буфері, поки він не буде спустошений.

`isClosed()` є потокобезпечним і може бути викликаний із будь-якого потоку без синхронізації.

## Значення, що повертається

`true` — канал закритий.
`false` — канал відкритий.

## Приклади

### Приклад #1 Перевірка стану каналу з головного потоку

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

    // Значення, буферизовані до закриття, ще доступні для читання
    echo $channel->recv(), "\n"; // "data"
});
```

### Приклад #2 Цикл споживача з перевіркою isClosed()

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
        // Читати до закриття І спустошення буфера
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

## Дивіться також

- [ThreadChannel::close](/uk/docs/reference/thread-channel/close.html) — Закрити канал
- [ThreadChannel::isEmpty](/uk/docs/reference/thread-channel/is-empty.html) — Перевірити, чи порожній буфер
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
