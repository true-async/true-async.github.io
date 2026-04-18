---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Отправить значение в поточный канал, блокируя вызывающий поток, если канал не может принять его немедленно."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Отправляет значение в канал. Это **блокирующая** операция — вызывающий поток блокируется,
если канал не может принять значение немедленно.

- Для **небуферизованного канала** (`capacity = 0`) поток блокируется до тех пор, пока другой поток
  не вызовет `recv()`.
- Для **буферизованного канала** поток блокируется только при заполненном буфере и разблокируется,
  как только получатель освободит слот.

В отличие от `Channel::send()` (которая приостанавливает корутину), `ThreadChannel::send()` блокирует
весь поток ОС. Учитывайте это при проектировании архитектуры — например, оставляйте отправляющий поток
свободным для блокировки или используйте буферизованный канал для снижения конкуренции.

Значение **глубоко копируется** перед помещением в канал. Замыкания, ресурсы и
несериализуемые объекты вызовут `ThreadTransferException`.

## Параметры

**value**
: Отправляемое значение. Может быть любого сериализуемого типа (скалярное, массив или сериализуемый объект).

## Ошибки

- Выбрасывает `Async\ChannelClosedException`, если канал уже закрыт.
- Выбрасывает `Async\ThreadTransferException`, если значение не может быть сериализовано для
  передачи между потоками.

## Примеры

### Пример #1 Отправка результатов из рабочего потока

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

### Пример #2 Небуферизованное рукопожатие между потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // небуферизованный
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // блокируется до получения запроса
        $responses->send(strtoupper($req));   // блокируется до принятия ответа
    });

    $requests->send('hello');                 // блокируется до вызова recv() сервером
    $reply = $responses->recv();              // блокируется до вызова send() сервером
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Пример #3 Обработка закрытого канала

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

## Смотрите также

- [ThreadChannel::recv](/ru/docs/reference/thread-channel/recv.html) — Получить значение из канала
- [ThreadChannel::isFull](/ru/docs/reference/thread-channel/is-full.html) — Проверить, заполнен ли буфер
- [ThreadChannel::close](/ru/docs/reference/thread-channel/close.html) — Закрыть канал
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
