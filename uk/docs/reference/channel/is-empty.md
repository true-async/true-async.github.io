---
layout: docs
lang: uk
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /uk/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Перевірити, чи буфер каналу порожній."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Перевіряє, чи буфер каналу порожній (немає значень, доступних для отримання).

Для каналу рандеву (`capacity = 0`) завжди повертає `true`,
оскільки дані передаються напряму без буферизації.

## Значення, що повертаються

`true` — буфер порожній.
`false` — буфер містить значення.

## Приклади

### Приклад #1 Перевірка наявності даних

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"
```

### Приклад #2 Пакетна обробка даних

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // чекаємо на надходження даних
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

## Дивіться також

- [Channel::isFull](/uk/docs/reference/channel/is-full.html) --- Перевірити, чи буфер заповнений
- [Channel::count](/uk/docs/reference/channel/count.html) --- Кількість значень у буфері
- [Channel::recv](/uk/docs/reference/channel/recv.html) --- Отримати значення
