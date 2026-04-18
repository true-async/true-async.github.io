---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Отримати загальну кількість завдань, виконаних пулом потоків з моменту його створення."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Повертає загальну кількість завдань, виконаних до завершення (успішно або з винятком) будь-яким робочим потоком цього пулу з моменту його створення. Цей лічильник монотонно зростає і ніколи не скидається. Він підкріплений атомарною змінною і є точним у будь-який момент часу.

Завдання вважається виконаним, коли робочий потік завершує його виконання — незалежно від того, повернуло воно значення або кинуло виняток.

## Значення, що повертається

`int` — загальна кількість виконаних завдань з моменту створення пулу.

## Приклади

### Приклад #1 Відстеження пропускної здатності

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

    delay(10);
    echo "completed so far: ", $pool->getCompletedCount(), "\n"; // 0 або більше

    foreach ($futures as $f) {
        await($f);
    }

    echo "completed total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Дивіться також

- [ThreadPool::getPendingCount()](/uk/docs/reference/thread-pool/get-pending-count.html) — завдання, що очікують у черзі
- [ThreadPool::getRunningCount()](/uk/docs/reference/thread-pool/get-running-count.html) — завдання, що зараз виконуються
- [ThreadPool::getWorkerCount()](/uk/docs/reference/thread-pool/get-worker-count.html) — кількість робочих потоків
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
