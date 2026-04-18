---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Получить следующее значение из поточного канала, блокируя вызывающий поток, если значений нет."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Получает следующее значение из канала. Это **блокирующая** операция — вызывающий поток
блокируется, если в канале нет доступных значений.

- Для **буферизованного канала** `recv()` возвращает значение немедленно, если в буфере есть хотя бы
  одно значение. Если буфер пуст, поток блокируется до появления значения от отправителя.
- Для **небуферизованного канала** (`capacity = 0`) `recv()` блокируется до тех пор, пока другой
  поток не вызовет `send()`.

Если канал закрыт, но в буфере ещё есть значения, они возвращаются в обычном режиме.
После опустошения буфера и закрытия канала `recv()` выбрасывает `ChannelClosedException`.

Полученное значение является **глубокой копией** оригинала — изменения возвращённого значения
не затрагивают копию отправителя.

## Возвращаемые значения

Следующее значение из канала (`mixed`).

## Ошибки

- Выбрасывает `Async\ChannelClosedException`, если канал закрыт и буфер пуст.

## Примеры

### Пример #1 Получение значений, созданных рабочим потоком

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

    // Получаем все значения — блокируется при пустом буфере
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

### Пример #2 Поток-потребитель, опустошающий общий канал

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Производитель: заполняет канал из одного потока
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Потребитель: опустошает канал из другого потока
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // буфер опустошён и канал закрыт
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Пример #3 Получение из небуферизованного канала

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // небуферизованный

    $sender = spawn_thread(function() use ($channel) {
        // Блокируется здесь до вызова recv() из главного потока
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // Главная корутина (поток) вызывает recv() — разблокирует отправителя
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## Смотрите также

- [ThreadChannel::send](/ru/docs/reference/thread-channel/send.html) — Отправить значение в канал
- [ThreadChannel::isEmpty](/ru/docs/reference/thread-channel/is-empty.html) — Проверить, пуст ли буфер
- [ThreadChannel::close](/ru/docs/reference/thread-channel/close.html) — Закрыть канал
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
