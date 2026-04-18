---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Створити новий потокобезпечний канал для обміну даними між потоками ОС."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Створює новий потокобезпечний канал для передачі даних між потоками ОС.

`ThreadChannel` є міжпотоковим аналогом [`Channel`](/uk/docs/components/channels.html).
Тоді як `Channel` призначений для комунікації між корутинами в межах одного потоку,
`ThreadChannel` дозволяє даним безпечно передаватись між **окремими потоками ОС** — наприклад, між
головним потоком і робочим потоком, запущеним через `spawn_thread()` або надісланим до `ThreadPool`.

Поведінка каналу залежить від параметра `$capacity`:

- **`capacity = 0`** — небуферизований (синхронний) канал. `send()` блокує викликаючий потік
  до тих пір, поки інший потік не викличе `recv()`. Це гарантує, що отримувач готовий раніше,
  ніж відправник продовжить роботу.
- **`capacity > 0`** — буферизований канал. `send()` не блокує, поки є місце в буфері.
  Коли буфер заповнений, викликаючий потік блокується до появи вільного місця.

Усі значення, що передаються через канал, **глибоко копіюються** — застосовуються ті самі правила
серіалізації, що й для `spawn_thread()`. Об'єкти, які не можна серіалізувати (наприклад, замикання, ресурси,
`stdClass` із посиланнями), спричинять `ThreadTransferException`.

## Параметри

**capacity**
: Місткість внутрішнього буфера каналу.
  `0` — небуферизований канал (за замовчуванням), `send()` блокує до готовності отримувача.
  Додатне число — розмір буфера; `send()` блокує лише коли буфер заповнений.

## Приклади

### Приклад #1 Небуферизований канал між потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // блокує до надсилання головним потоком
        return "Worker received: $value";
    });

    $channel->send('hello'); // блокує до виклику recv() робочим потоком
    echo await($thread), "\n";
});
```

### Приклад #2 Буферизований канал між потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // буфер на 10 елементів

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // не блокує, поки буфер не заповнений
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## Дивіться також

- [ThreadChannel::send](/uk/docs/reference/thread-channel/send.html) — Надіслати значення до каналу
- [ThreadChannel::recv](/uk/docs/reference/thread-channel/recv.html) — Отримати значення з каналу
- [ThreadChannel::capacity](/uk/docs/reference/thread-channel/capacity.html) — Отримати місткість каналу
- [ThreadChannel::close](/uk/docs/reference/thread-channel/close.html) — Закрити канал
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
