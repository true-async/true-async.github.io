---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Отримати наступне значення з потокового каналу, блокуючи викликаючий потік, якщо значень немає."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Отримує наступне значення з каналу. Це **блокуюча** операція — викликаючий потік
блокується, якщо в каналі наразі немає значень.

- Для **буферизованого каналу**, `recv()` повертає значення негайно, якщо буфер містить принаймні одне значення.
  Якщо буфер порожній, потік блокується до того, як відправник помістить значення.
- Для **небуферизованого каналу** (`capacity = 0`), `recv()` блокує до тих пір, поки інший потік не викличе `send()`.

Якщо канал закрито і буфер ще містить значення, ці значення повертаються нормально.
Як тільки буфер спустошено і канал закрито, `recv()` кидає `ChannelClosedException`.

Отримане значення є **глибокою копією** оригіналу — зміни поверненого значення не
впливають на копію відправника.

## Значення, що повертається

Наступне значення з каналу (`mixed`).

## Помилки

- Кидає `Async\ChannelClosedException`, якщо канал закритий і буфер порожній.

## Приклади

### Приклад #1 Отримання значень, вироблених робочим потоком

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Отримуємо всі значення — блокує при порожньому буфері
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "All values received\n";
    }

    await($worker);
});
```

### Приклад #2 Потік споживача, що спустошує спільний канал

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Виробник: заповнює канал з одного потоку
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Споживач: спустошує канал з іншого потоку
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // буфер спустошено і канал закрито
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Приклад #3 Отримання з небуферизованого каналу

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // небуферизований

    $sender = spawn_thread(function() use ($channel) {
        // Блокує тут до виклику recv() головним потоком
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // Головна корутина (потік) викликає recv() — розблоковує відправника
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## Дивіться також

- [ThreadChannel::send](/uk/docs/reference/thread-channel/send.html) — Надіслати значення до каналу
- [ThreadChannel::isEmpty](/uk/docs/reference/thread-channel/is-empty.html) — Перевірити, чи порожній буфер
- [ThreadChannel::close](/uk/docs/reference/thread-channel/close.html) — Закрити канал
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
