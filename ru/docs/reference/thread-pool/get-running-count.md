---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Получить количество задач, выполняющихся в рабочих потоках в данный момент."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Возвращает количество задач, которые в данный момент выполняются рабочим потоком (т.е. взяты из очереди и ещё не завершены). Максимальное значение ограничено количеством рабочих потоков. Счётчик реализован на основе атомарной переменной и точен в любой момент времени.

## Возвращаемое значение

`int` — количество задач, выполняющихся во всех рабочих потоках в данный момент.

## Примеры

### Пример #1 Отслеживание счётчика выполняющихся задач

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

    delay(10); // дать рабочим потокам время запуститься

    echo "workers: ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "running: ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "running: ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::getPendingCount()](/ru/docs/reference/thread-pool/get-pending-count.html) — задачи, ожидающие в очереди
- [ThreadPool::getCompletedCount()](/ru/docs/reference/thread-pool/get-completed-count.html) — общее количество завершённых задач
- [ThreadPool::getWorkerCount()](/ru/docs/reference/thread-pool/get-worker-count.html) — количество рабочих потоков
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
