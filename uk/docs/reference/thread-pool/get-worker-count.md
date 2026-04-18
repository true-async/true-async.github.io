---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Отримати кількість робочих потоків у пулі потоків."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Повертає кількість робочих потоків у пулі. Це значення фіксується під час конструювання і не змінюється протягом усього часу існування пулу. Воно дорівнює аргументу `$workers`, переданому в [`new ThreadPool()`](/uk/docs/reference/thread-pool/__construct.html).

## Значення, що повертається

`int` — кількість робочих потоків (як задано в конструкторі).

## Приклади

### Приклад #1 Перевірка кількості робочих потоків

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

### Приклад #2 Визначення розміру пулу за кількістю доступних ядер CPU

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

## Дивіться також

- [ThreadPool::getPendingCount()](/uk/docs/reference/thread-pool/get-pending-count.html) — завдання, що очікують у черзі
- [ThreadPool::getRunningCount()](/uk/docs/reference/thread-pool/get-running-count.html) — завдання, що зараз виконуються
- [ThreadPool::getCompletedCount()](/uk/docs/reference/thread-pool/get-completed-count.html) — загальна кількість виконаних завдань
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
