---
layout: docs
lang: ru
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /ru/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Получить итератор для обхода значений канала через foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Возвращает итератор для обхода значений канала. Channel реализует
интерфейс `IteratorAggregate`, поэтому можно использовать `foreach` напрямую.

Итератор приостанавливает текущую корутину при ожидании следующего значения.
Итерация завершается, когда канал закрыт **и** буфер пуст.

> **Важно:** Если канал не будет закрыт, `foreach` будет ожидать новых значений бесконечно.

## Возвращаемые значения

Объект `\Iterator` для обхода значений канала.

## Примеры

### Пример #1 Чтение канала через foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('один');
    $channel->send('два');
    $channel->send('три');
    $channel->close(); // без этого foreach не завершится
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Получено: $value\n";
    }
    echo "Все значения обработаны\n";
});
```

### Пример #2 Паттерн producer-consumer

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Producer
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consumer
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Загружено: $url ({$response->status})\n";
    }
});
```

## См. также

- [Channel::recv](/ru/docs/reference/channel/recv.html) --- Получить одно значение
- [Channel::close](/ru/docs/reference/channel/close.html) --- Закрыть канал (завершает итерацию)
- [Channel::isEmpty](/ru/docs/reference/channel/is-empty.html) --- Проверить, пуст ли буфер
