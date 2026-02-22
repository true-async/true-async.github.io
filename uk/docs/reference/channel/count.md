---
layout: docs
lang: uk
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /uk/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Отримати кількість значень у буфері каналу."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Повертає поточну кількість значень у буфері каналу.

Channel реалізує інтерфейс `Countable`, тому можна використовувати `count($channel)`.

Для каналу рандеву (`capacity = 0`) завжди повертає `0`.

## Значення, що повертаються

Кількість значень у буфері (`int`).

## Приклади

### Приклад #1 Моніторинг рівня заповнення буфера

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Приклад #2 Логування навантаження каналу

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Буфер заповнено на " . round($usage) . "%\n";
        delay(1000);
    }
});
```

## Дивіться також

- [Channel::capacity](/uk/docs/reference/channel/capacity.html) --- Ємність каналу
- [Channel::isEmpty](/uk/docs/reference/channel/is-empty.html) --- Перевірити, чи буфер порожній
- [Channel::isFull](/uk/docs/reference/channel/is-full.html) --- Перевірити, чи буфер заповнений
