---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Проверить, заполнен ли буфер поточного канала до максимальной ёмкости."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Возвращает `true`, если буфер канала достиг максимальной ёмкости.

Для небуферизованного канала (`capacity = 0`) всегда возвращает `true`, поскольку буфера нет —
каждый `send()` должен ждать соответствующего `recv()`.

`isFull()` является потокобезопасной. Результат отражает состояние на момент вызова;
другой поток может освободить слот непосредственно после этого.

## Возвращаемые значения

`true` — буфер заполнен до ёмкости (или канал небуферизованный).
`false` — в буфере есть хотя бы один свободный слот.

## Примеры

### Пример #1 Проверка заполненности буфера перед отправкой

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Пример #2 Мониторинг обратного давления в потоке-производителе

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // Буфер в данный момент заполнен — send() заблокируется;
                // записываем обратное давление для наблюдаемости
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // блокируется до освобождения места
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Имитация медленного потребителя
                $val = $channel->recv();
                // обработка $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Смотрите также

- [ThreadChannel::isEmpty](/ru/docs/reference/thread-channel/is-empty.html) — Проверить, пуст ли буфер
- [ThreadChannel::capacity](/ru/docs/reference/thread-channel/capacity.html) — Ёмкость канала
- [ThreadChannel::count](/ru/docs/reference/thread-channel/count.html) — Количество значений в буфере
- [ThreadChannel::send](/ru/docs/reference/thread-channel/send.html) — Отправить значение (блокируется при заполненном буфере)
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
