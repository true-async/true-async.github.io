---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Создание нового ThreadPool с фиксированным числом рабочих потоков."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Создаёт новый пул потоков и немедленно запускает все рабочие потоки. Потоки остаются активными на протяжении всего времени жизни пула, что исключает накладные расходы на запуск потока для каждой задачи.

## Параметры

| Параметр     | Тип   | Описание                                                                                                          |
|--------------|-------|-------------------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Количество создаваемых рабочих потоков. Должно быть ≥ 1. Все потоки запускаются в момент создания объекта.        |
| `$queueSize` | `int` | Максимальное количество задач, которые могут ожидать в очереди. `0` (по умолчанию) означает `$workers × 4`. Когда очередь заполнена, `submit()` приостанавливает вызывающую корутину до освобождения слота. |

## Исключения

Выбрасывает `\ValueError`, если `$workers < 1`.

## Примеры

### Пример #1 Базовое создание пула

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 рабочих потока, размер очереди по умолчанию — 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Пример #2 Явное указание размера очереди

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 рабочих потока, очередь ограничена 64 задачами
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... отправляем задачи ...

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::submit()](/ru/docs/reference/thread-pool/submit.html) — добавление задачи в пул
- [ThreadPool::close()](/ru/docs/reference/thread-pool/close.html) — плановое завершение работы
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — отдельный поток для одной задачи
