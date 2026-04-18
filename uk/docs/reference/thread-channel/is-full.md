---
layout: docs
lang: uk
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /uk/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Перевірити, чи заповнений буфер потокового каналу до максимальної місткості."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Повертає `true`, якщо буфер каналу досяг своєї максимальної місткості.

Для небуферизованого каналу (`capacity = 0`) завжди повертає `true`, оскільки
буфера немає — кожен `send()` повинен чекати відповідного `recv()`.

`isFull()` є потокобезпечним. Результат відображає стан у момент виклику;
інший потік може звільнити місце одразу після цього.

## Значення, що повертається

`true` — буфер заповнений до місткості (або це небуферизований канал).
`false` — у буфері є принаймні одне вільне місце.

## Приклади

### Приклад #1 Перевірка заповненості буфера перед надсиланням

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

### Приклад #2 Моніторинг зворотного тиску в потоці виробника

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
                // Буфер зараз заповнений — send() блокуватиме;
                // логуємо зворотний тиск для спостережуваності
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // блокує до появи вільного місця
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Симулюємо повільного споживача
                $val = $channel->recv();
                // обробляємо $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Дивіться також

- [ThreadChannel::isEmpty](/uk/docs/reference/thread-channel/is-empty.html) — Перевірити, чи порожній буфер
- [ThreadChannel::capacity](/uk/docs/reference/thread-channel/capacity.html) — Місткість каналу
- [ThreadChannel::count](/uk/docs/reference/thread-channel/count.html) — Кількість значень у буфері
- [ThreadChannel::send](/uk/docs/reference/thread-channel/send.html) — Надіслати значення (блокує при заповненні)
- [Огляд компонента ThreadChannel](/uk/docs/components/thread-channels.html)
