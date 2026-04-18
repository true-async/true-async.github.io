---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "М'яко завершити роботу пулу потоків, дочекавшись виконання всіх завдань у черзі та тих, що виконуються."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Ініціює м'яке завершення роботи пулу. Після виклику `close()`:

- Будь-який наступний виклик `submit()` негайно кидає `Async\ThreadPoolException`.
- Завдання, які вже знаходяться в черзі, продовжують виконуватись і завершуються нормально.
- Завдання, які зараз виконуються в робочих потоках, завершуються нормально.
- Метод блокує викликаючу корутину до тих пір, поки всі завдання в процесі не будуть виконані і всі робочі потоки не зупиняться.

Для негайного примусового завершення роботи, що відкидає завдання в черзі, використовуйте натомість [`cancel()`](/uk/docs/reference/thread-pool/cancel.html).

## Значення, що повертається

`void`

## Приклади

### Приклад #1 М'яке завершення після надсилання всіх завдань

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // чекає завершення завдання вище

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Приклад #2 Виклик submit() після close() кидає виняток

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## Дивіться також

- [ThreadPool::cancel()](/uk/docs/reference/thread-pool/cancel.html) — примусове завершення роботи
- [ThreadPool::isClosed()](/uk/docs/reference/thread-pool/is-closed.html) — перевірити, чи закритий пул
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
