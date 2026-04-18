---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Получить общее количество задач, выполненных пулом потоков с момента создания."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Возвращает общее количество задач, доведённых до конца (успешно или с исключением) любым рабочим потоком данного пула с момента его создания. Счётчик монотонно возрастает и никогда не сбрасывается. Реализован на основе атомарной переменной и точен в любой момент времени.

Задача считается завершённой, когда рабочий поток заканчивает её выполнение — независимо от того, вернула ли она значение или выбросила исключение.

## Возвращаемое значение

`int` — общее количество завершённых задач с момента создания пула.

## Примеры

### Пример #1 Отслеживание пропускной способности

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
    echo "completed so far: ", $pool->getCompletedCount(), "\n"; // 0 или больше

    foreach ($futures as $f) {
        await($f);
    }

    echo "completed total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::getPendingCount()](/ru/docs/reference/thread-pool/get-pending-count.html) — задачи, ожидающие в очереди
- [ThreadPool::getRunningCount()](/ru/docs/reference/thread-pool/get-running-count.html) — задачи, выполняющиеся в данный момент
- [ThreadPool::getWorkerCount()](/ru/docs/reference/thread-pool/get-worker-count.html) — количество рабочих потоков
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
