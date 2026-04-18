---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Надіслати завдання до пулу потоків і отримати Future для його результату."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Додає завдання до внутрішньої черги пулу. Вільний робочий потік бере його, виконує і вирішує повернутий `Future` з поверненим значенням. Якщо черга заповнена, викликаюча корутина призупиняється до появи вільного місця.

## Параметри

| Параметр   | Тип        | Опис                                                                                                                                                               |
|------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$task`    | `callable` | Callable для виконання в робочому потоці. Глибоко копіюється в робочий потік — замикання, що захоплюють об'єкти або ресурси, кинуть `Async\ThreadTransferException`. |
| `...$args` | `mixed`    | Додаткові аргументи, що передаються до `$task`. Також глибоко копіюються.                                                                                          |

## Значення, що повертається

`Async\Future` — вирішується з поверненим значенням `$task` або відхиляється з будь-яким винятком, кинутим `$task`.

## Винятки

- `Async\ThreadPoolException` — кидається негайно, якщо пул закрито через `close()` або `cancel()`.
- `Async\ThreadTransferException` — кидається, якщо `$task` або будь-який аргумент не може бути серіалізований для передачі (наприклад, `stdClass`, PHP-посилання, ресурси).

## Приклади

### Приклад #1 Базове надсилання та очікування

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### Приклад #2 Обробка винятків із завдання

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### Приклад #3 Надсилання кількох завдань паралельно

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## Дивіться також

- [ThreadPool::map()](/uk/docs/reference/thread-pool/map.html) — паралельний map по масиву
- [ThreadPool::close()](/uk/docs/reference/thread-pool/close.html) — м'яке завершення роботи
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента та правила передачі даних
