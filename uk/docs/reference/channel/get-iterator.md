---
layout: docs
lang: uk
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /uk/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Отримати ітератор для обходу значень каналу за допомогою foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Повертає ітератор для обходу значень каналу. Channel реалізує
інтерфейс `IteratorAggregate`, тому можна використовувати `foreach` напряму.

Ітератор призупиняє поточну корутину під час очікування наступного значення.
Ітерація завершується, коли канал закрито **і** буфер порожній.

> **Важливо:** Якщо канал ніколи не буде закрито, `foreach` чекатиме нових значень нескінченно.

## Значення, що повертаються

Об'єкт `\Iterator` для обходу значень каналу.

## Приклади

### Приклад #1 Читання каналу за допомогою foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // без цього foreach ніколи не завершиться
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Отримано: $value\n";
    }
    echo "Усі значення оброблено\n";
});
```

### Приклад #2 Патерн виробник-споживач

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Виробник
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Споживач
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Завантажено: $url ({$response->status})\n";
    }
});
```

## Дивіться також

- [Channel::recv](/uk/docs/reference/channel/recv.html) --- Отримати одне значення
- [Channel::close](/uk/docs/reference/channel/close.html) --- Закрити канал (завершує ітерацію)
- [Channel::isEmpty](/uk/docs/reference/channel/is-empty.html) --- Перевірити, чи буфер порожній
