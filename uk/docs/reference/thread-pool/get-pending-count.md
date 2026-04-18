---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Отримати кількість завдань, що очікують у черзі пулу потоків."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Повертає кількість завдань, які були надіслані, але ще не взяті робочим потоком. Цей лічильник підкріплений атомарною змінною і є точним у будь-який момент часу, навіть поки робочі потоки виконуються паралельно.

## Значення, що повертається

`int` — кількість завдань, що зараз очікують у черзі.

## Приклади

### Приклад #1 Спостереження за спустошенням черги

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // дати час робочим потокам запуститись

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## Дивіться також

- [ThreadPool::getRunningCount()](/uk/docs/reference/thread-pool/get-running-count.html) — завдання, що зараз виконуються
- [ThreadPool::getCompletedCount()](/uk/docs/reference/thread-pool/get-completed-count.html) — загальна кількість виконаних завдань
- [ThreadPool::getWorkerCount()](/uk/docs/reference/thread-pool/get-worker-count.html) — кількість робочих потоків
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
