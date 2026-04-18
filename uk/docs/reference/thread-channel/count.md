---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Отримати кількість значень, що зараз буферизовані у потоковому каналі."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Повертає поточну кількість значень у буфері каналу.

`ThreadChannel` реалізує інтерфейс `Countable`, тому можна також використовувати `count($channel)`.

Для небуферизованого каналу (`capacity = 0`) завжди повертає `0` — значення передаються
безпосередньо між потоками без буферизації.

Лічильник зчитується атомарно і є точним у момент виклику, навіть коли інші потоки
конкурентно надсилають або отримують значення.

## Значення, що повертається

Кількість значень, що зараз знаходяться в буфері (`int`).

## Приклади

### Приклад #1 Моніторинг рівня заповненості буфера

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — інтерфейс Countable

$channel->recv();
echo $channel->count();   // 2
```

### Приклад #2 Логування завантаження каналу з потоку моніторингу

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Потік моніторингу: періодично логує використання буфера
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // У реальному потоці тут використовується sleep() або семафор
        }
    });

    // ... потоки виробника та споживача ...

    $tasks->close();
    await($monitor);
});
```

## Дивіться також

- [ThreadChannel::capacity](/uk/docs/reference/thread-channel/capacity.html) — Місткість каналу
- [ThreadChannel::isEmpty](/uk/docs/reference/thread-channel/is-empty.html) — Перевірити, чи порожній буфер
- [ThreadChannel::isFull](/uk/docs/reference/thread-channel/is-full.html) — Перевірити, чи заповнений буфер
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
