---
layout: docs
lang: ru
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /ru/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Проверить, пуст ли буфер канала."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Проверяет, пуст ли буфер канала (нет значений для получения).

Для канала-рандеву (`capacity = 0`) всегда возвращает `true`,
так как данные передаются напрямую без буферизации.

## Возвращаемые значения

`true` — буфер пуст.
`false` — в буфере есть значения.

## Примеры

### Пример #1 Проверка наличия данных

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "пусто" : "есть данные"; // "пусто"

$channel->send(42);

echo $channel->isEmpty() ? "пусто" : "есть данные"; // "есть данные"
```

### Пример #2 Обработка данных пакетами

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // подождать поступления данных
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## См. также

- [Channel::isFull](/ru/docs/reference/channel/is-full.html) --- Проверить, полон ли буфер
- [Channel::count](/ru/docs/reference/channel/count.html) --- Количество значений в буфере
- [Channel::recv](/ru/docs/reference/channel/recv.html) --- Получить значение
