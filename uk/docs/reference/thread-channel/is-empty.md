---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Перевірити, чи не містить буфер потокового каналу жодних значень."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Повертає `true`, якщо буфер каналу не містить жодних значень.

Для небуферизованого каналу (`capacity = 0`) завжди повертає `true`, оскільки дані
передаються безпосередньо між потоками без буферизації.

`isEmpty()` є потокобезпечним. Результат відображає стан у момент виклику;
інший потік може одразу після цього помістити значення в канал.

## Значення, що повертається

`true` — буфер порожній (немає доступних значень).
`false` — буфер містить принаймні одне значення.

## Приклади

### Приклад #1 Перевірка наявності буферизованих даних перед отриманням

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

### Приклад #2 Споживач, що спустошує закритий канал

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
        // Чекати, поки є що читати або канал закриється
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Буфер тимчасово порожній — поступитися і повторити
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

## Дивіться також

- [ThreadChannel::isFull](/uk/docs/reference/thread-channel/is-full.html) — Перевірити, чи заповнений буфер
- [ThreadChannel::count](/uk/docs/reference/thread-channel/count.html) — Кількість значень у буфері
- [ThreadChannel::recv](/uk/docs/reference/thread-channel/recv.html) — Отримати значення
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
