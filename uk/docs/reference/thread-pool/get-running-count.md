---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Отримати кількість завдань, що зараз виконуються в робочих потоках."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Повертає кількість завдань, які зараз виконуються робочим потоком (тобто взяті з черги і ще не завершені). Максимальне значення обмежено кількістю робочих потоків. Цей лічильник підкріплений атомарною змінною і є точним у будь-який момент часу.

## Значення, що повертається

`int` — кількість завдань, що зараз виконуються в усіх робочих потоках.

## Приклади

### Приклад #1 Спостереження за лічильником виконання під час роботи завдань

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // дати робочим потокам час запуститись

    echo "workers: ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "running: ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "running: ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## Дивіться також

- [ThreadPool::getPendingCount()](/uk/docs/reference/thread-pool/get-pending-count.html) — завдання, що очікують у черзі
- [ThreadPool::getCompletedCount()](/uk/docs/reference/thread-pool/get-completed-count.html) — загальна кількість виконаних завдань
- [ThreadPool::getWorkerCount()](/uk/docs/reference/thread-pool/get-worker-count.html) — кількість робочих потоків
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
