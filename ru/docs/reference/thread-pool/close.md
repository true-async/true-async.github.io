---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Плановое завершение работы пула потоков с ожиданием завершения всех задач в очереди и выполняющихся задач."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Инициирует плановое завершение работы пула. После вызова `close()`:

- Любой последующий вызов `submit()` немедленно выбрасывает `Async\ThreadPoolException`.
- Задачи, уже находящиеся в очереди, продолжают выполняться и завершаются в штатном режиме.
- Задачи, выполняющиеся в рабочих потоках в данный момент, завершаются в штатном режиме.
- Метод блокирует вызывающую корутину до завершения всех выполняющихся задач и остановки всех рабочих потоков.

Для немедленного принудительного завершения с отбрасыванием задач в очереди используйте [`cancel()`](/ru/docs/reference/thread-pool/cancel.html).

## Возвращаемое значение

`void`

## Примеры

### Пример #1 Плановое завершение после отправки всех задач

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

    $pool->close(); // ожидает завершения задачи выше

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Пример #2 Вызов submit после close выбрасывает исключение

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

## Смотрите также

- [ThreadPool::cancel()](/ru/docs/reference/thread-pool/cancel.html) — принудительное завершение
- [ThreadPool::isClosed()](/ru/docs/reference/thread-pool/is-closed.html) — проверить, закрыт ли пул
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
