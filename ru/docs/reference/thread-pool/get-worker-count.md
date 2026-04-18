---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Получить количество рабочих потоков в пуле потоков."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Возвращает количество рабочих потоков в пуле. Это значение фиксируется в момент создания и не изменяется на протяжении жизни пула. Оно равно аргументу `$workers`, переданному в [`new ThreadPool()`](/ru/docs/reference/thread-pool/__construct.html).

## Возвращаемое значение

`int` — количество рабочих потоков (как задано в конструкторе).

## Примеры

### Пример #1 Проверка количества рабочих потоков

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    echo $pool->getWorkerCount(), "\n"; // 4

    $pool->close();
});
```

### Пример #2 Настройка пула по числу доступных ядер CPU

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool created with ", $pool->getWorkerCount(), " workers\n";

    $futures = [];
    for ($i = 0; $i < $cores * 2; $i++) {
        $futures[] = $pool->submit(fn() => 'done');
    }
    foreach ($futures as $f) {
        await($f);
    }

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::getPendingCount()](/ru/docs/reference/thread-pool/get-pending-count.html) — задачи, ожидающие в очереди
- [ThreadPool::getRunningCount()](/ru/docs/reference/thread-pool/get-running-count.html) — задачи, выполняющиеся в данный момент
- [ThreadPool::getCompletedCount()](/ru/docs/reference/thread-pool/get-completed-count.html) — общее количество завершённых задач
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
