---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Создание нового потокобезопасного канала для обмена данными между потоками ОС."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Создаёт новый потокобезопасный канал для передачи данных между потоками ОС.

`ThreadChannel` — это межпоточный аналог [`Channel`](/ru/docs/components/channels.html).
Если `Channel` предназначен для взаимодействия корутин внутри одного потока,
то `ThreadChannel` позволяет безопасно передавать данные между **отдельными потоками ОС** — например, между
главным потоком и рабочим, запущенным через `spawn_thread()` или переданным в `ThreadPool`.

Поведение канала определяется параметром `$capacity`:

- **`capacity = 0`** — небуферизованный (синхронный) канал. `send()` блокирует вызывающий поток
  до тех пор, пока другой поток не вызовет `recv()`. Это гарантирует, что получатель готов принять
  данные до того, как отправитель продолжит работу.
- **`capacity > 0`** — буферизованный канал. `send()` не блокируется, пока в буфере есть место.
  Когда буфер заполнен, вызывающий поток блокируется до освобождения места.

Все значения, передаваемые через канал, **глубоко копируются** — применяются те же правила
сериализации, что и при `spawn_thread()`. Объекты, которые не поддаются сериализации (например,
замыкания, ресурсы, `stdClass` со ссылками), вызывают `ThreadTransferException`.

## Параметры

**capacity**
: Ёмкость внутреннего буфера канала.
  `0` — небуферизованный канал (по умолчанию), `send()` блокируется до готовности получателя.
  Положительное число — размер буфера; `send()` блокируется только при заполненном буфере.

## Примеры

### Пример #1 Небуферизованный канал между потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // блокируется до отправки из главного потока
        return "Worker received: $value";
    });

    $channel->send('hello'); // блокируется до вызова recv() в рабочем потоке
    echo await($thread), "\n";
});
```

### Пример #2 Буферизованный канал между потоками

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // буфер на 10 элементов

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // не блокируется, пока буфер не заполнен
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

## Смотрите также

- [ThreadChannel::send](/ru/docs/reference/thread-channel/send.html) — Отправить значение в канал
- [ThreadChannel::recv](/ru/docs/reference/thread-channel/recv.html) — Получить значение из канала
- [ThreadChannel::capacity](/ru/docs/reference/thread-channel/capacity.html) — Получить ёмкость канала
- [ThreadChannel::close](/ru/docs/reference/thread-channel/close.html) — Закрыть канал
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
