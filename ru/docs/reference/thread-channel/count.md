---
layout: docs
lang: ru
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /ru/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Получить количество значений, находящихся в буфере поточного канала."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Возвращает текущее количество значений, находящихся в буфере канала.

`ThreadChannel` реализует интерфейс `Countable`, поэтому можно также использовать `count($channel)`.

Для небуферизованного канала (`capacity = 0`) всегда возвращает `0` — значения передаются
напрямую между потоками без буферизации.

Счётчик считывается атомарно и актуален на момент вызова, даже когда другие потоки
конкурентно отправляют или получают значения.

## Возвращаемые значения

Количество значений, находящихся в буфере в данный момент (`int`).

## Примеры

### Пример #1 Мониторинг уровня заполнения буфера

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — интерфейс Countable

$channel->recv();
echo $channel->count();   // 2
```

### Пример #2 Журналирование загруженности канала из потока-монитора

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Поток-монитор: периодически записывает использование буфера
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // В реальном потоке здесь следует использовать sleep() или семафор
        }
    });

    // ... потоки производителя и потребителя ...

    $tasks->close();
    await($monitor);
});
```

## Смотрите также

- [ThreadChannel::capacity](/ru/docs/reference/thread-channel/capacity.html) — Ёмкость канала
- [ThreadChannel::isEmpty](/ru/docs/reference/thread-channel/is-empty.html) — Проверить, пуст ли буфер
- [ThreadChannel::isFull](/ru/docs/reference/thread-channel/is-full.html) — Проверить, заполнен ли буфер
- [Обзор компонента ThreadChannel](/ru/docs/components/thread-channels.html)
