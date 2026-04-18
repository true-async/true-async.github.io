---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Примусово зупинити пул потоків, негайно відхиливши всі завдання в черзі."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Ініціює примусове завершення роботи пулу. Після виклику `cancel()`:

- Будь-який наступний виклик `submit()` негайно кидає `Async\ThreadPoolException`.
- Завдання, що очікують у черзі (ще не взяті робочим потоком), **негайно відхиляються** — відповідні об'єкти `Future` переходять у стан відхилення з `ThreadPoolException`.
- Завдання, які вже виконуються в робочих потоках, доводяться до завершення поточного завдання (примусово перервати PHP-код всередині потоку неможливо).
- Робочі потоки зупиняються, щойно завершать поточне завдання, і більше не беруть нових завдань із черги.

Для м'якого завершення роботи, яке дає можливість виконати всі завдання в черзі, використовуйте натомість [`close()`](/uk/docs/reference/thread-pool/close.html).

## Значення, що повертається

`void`

## Приклади

### Приклад #1 Примусова відміна із завданнями в черзі

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Заповнюємо чергу 8 завданнями на 2 робочі потоки
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Скасовуємо негайно — завдання в черзі відхиляються
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (вже виконувались на момент виклику cancel())
    echo "cancelled: $cancelled\n"; // 6  (ще були в черзі)
});
```

## Дивіться також

- [ThreadPool::close()](/uk/docs/reference/thread-pool/close.html) — м'яке завершення роботи
- [ThreadPool::isClosed()](/uk/docs/reference/thread-pool/is-closed.html) — перевірити, чи закритий пул
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента та порівняння close() і cancel()
