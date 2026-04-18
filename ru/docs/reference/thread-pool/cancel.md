---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Принудительная остановка пула потоков с немедленным отклонением всех задач в очереди."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Инициирует принудительное завершение работы пула. После вызова `cancel()`:

- Любой последующий вызов `submit()` немедленно выбрасывает `Async\ThreadPoolException`.
- Задачи, ожидающие в очереди (ещё не взятые рабочим потоком), **немедленно отклоняются** — соответствующие объекты `Future` переходят в состояние отклонения с `ThreadPoolException`.
- Задачи, уже выполняющиеся в рабочих потоках, доводятся до конца текущей задачи (принудительное прерывание PHP-кода внутри потока невозможно).
- Рабочие потоки останавливаются сразу после завершения текущей задачи и не берут новые задачи из очереди.

Для планового завершения, при котором все задачи в очереди доводятся до конца, используйте [`close()`](/ru/docs/reference/thread-pool/close.html).

## Возвращаемое значение

`void`

## Примеры

### Пример #1 Принудительная отмена при наличии задач в очереди

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Заполняем очередь 8 задачами на 2 рабочих потока
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Немедленная отмена — задачи в очереди отклоняются
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (уже выполнялись на момент вызова cancel())
    echo "cancelled: $cancelled\n"; // 6  (ещё находились в очереди)
});
```

## Смотрите также

- [ThreadPool::close()](/ru/docs/reference/thread-pool/close.html) — плановое завершение
- [ThreadPool::isClosed()](/ru/docs/reference/thread-pool/is-closed.html) — проверить, закрыт ли пул
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента и сравнение close() vs cancel()
