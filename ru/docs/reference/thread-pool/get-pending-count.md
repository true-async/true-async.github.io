---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Получить количество задач, ожидающих в очереди пула потоков."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Возвращает количество задач, которые были отправлены, но ещё не взяты рабочим потоком. Счётчик реализован на основе атомарной переменной и точен в любой момент времени, даже пока рабочие потоки выполняются параллельно.

## Возвращаемое значение

`int` — количество задач, ожидающих в очереди в данный момент.

## Примеры

### Пример #1 Наблюдение за опустошением очереди

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

    delay(10); // дать рабочим потокам время запуститься

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::getRunningCount()](/ru/docs/reference/thread-pool/get-running-count.html) — задачи, выполняющиеся в данный момент
- [ThreadPool::getCompletedCount()](/ru/docs/reference/thread-pool/get-completed-count.html) — общее количество завершённых задач
- [ThreadPool::getWorkerCount()](/ru/docs/reference/thread-pool/get-worker-count.html) — количество рабочих потоков
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
