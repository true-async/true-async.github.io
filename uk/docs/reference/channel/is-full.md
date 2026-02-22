---
layout: docs
lang: uk
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /uk/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Перевірити, чи буфер каналу заповнений."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Перевіряє, чи буфер каналу заповнений до максимальної ємності.

Для каналу рандеву (`capacity = 0`) завжди повертає `true`,
оскільки буфер відсутній.

## Значення, що повертаються

`true` — буфер заповнений (або це канал рандеву).
`false` — у буфері є вільне місце.

## Приклади

### Приклад #1 Перевірка заповненості буфера

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Приклад #2 Адаптивна швидкість відправлення

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Буфер заповнений, сповільнюємо обробку\n";
        }
        $channel->send($line); // призупиняється, якщо заповнений
    }
    $channel->close();
});
```

## Дивіться також

- [Channel::isEmpty](/uk/docs/reference/channel/is-empty.html) --- Перевірити, чи буфер порожній
- [Channel::capacity](/uk/docs/reference/channel/capacity.html) --- Ємність каналу
- [Channel::count](/uk/docs/reference/channel/count.html) --- Кількість значень у буфері
- [Channel::sendAsync](/uk/docs/reference/channel/send-async.html) --- Неблокуюче відправлення
