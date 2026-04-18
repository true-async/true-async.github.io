---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Надіслати значення до потокового каналу, блокуючи викликаючий потік, якщо канал не може прийняти його негайно."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Надсилає значення до каналу. Це **блокуюча** операція — викликаючий потік блокується,
якщо канал не може прийняти значення негайно.

- Для **небуферизованого каналу** (`capacity = 0`), потік блокується до тих пір, поки інший потік не викличе `recv()`.
- Для **буферизованого каналу**, потік блокується лише коли буфер заповнений, і розблоковується, щойно
  отримувач звільняє місце.

На відміну від `Channel::send()` (яка призупиняє корутину), `ThreadChannel::send()` блокує
весь потік ОС. Відповідно проектуйте свою архітектуру — наприклад, залишайте потік відправника
вільним для блокування або використовуйте буферизований канал для зменшення конкуренції.

Значення **глибоко копіюється** перед тим, як потрапити до каналу. Замикання, ресурси та
несеріалізовані об'єкти спричинять `ThreadTransferException`.

## Параметри

**value**
: Значення для надсилання. Може бути будь-якого серіалізовуваного типу (скалярне, масив або серіалізовуваний об'єкт).

## Помилки

- Кидає `Async\ChannelClosedException`, якщо канал вже закритий.
- Кидає `Async\ThreadTransferException`, якщо значення не може бути серіалізоване для міжпотокової передачі.

## Приклади

### Приклад #1 Надсилання результатів із робочого потоку

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
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### Приклад #2 Небуферизоване рукостискання між потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // небуферизований
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // блокує до отримання запиту
        $responses->send(strtoupper($req));   // блокує до прийому відповіді
    });

    $requests->send('hello');                 // блокує до виклику recv() сервером
    $reply = $responses->recv();              // блокує до виклику send() сервером
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Приклад #3 Обробка закритого каналу

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Send failed: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## Дивіться також

- [ThreadChannel::recv](/uk/docs/reference/thread-channel/recv.html) — Отримати значення з каналу
- [ThreadChannel::isFull](/uk/docs/reference/thread-channel/is-full.html) — Перевірити, чи заповнений буфер
- [ThreadChannel::close](/uk/docs/reference/thread-channel/close.html) — Закрити канал
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
