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
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

Создаёт новый пул потоков и немедленно запускает все рабочие потоки. Потоки остаются активными на протяжении всего времени жизни пула, что исключает накладные расходы на запуск потока для каждой задачи.

## Параметры

| Параметр       | Тип          | Описание                                                                                                          |
|----------------|--------------|-------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`        | Количество рабочих потоков. `0` (по умолчанию) — автодетект через [`Async\available_parallelism()`](/ru/docs/reference/available-parallelism.html). |
| `$queueSize`   | `int`        | Максимальная длина очереди ожидающих задач. `0` (по умолчанию) — `workers × 4`. Когда очередь полна, `submit()` приостанавливает вызывающую корутину до освобождения слота. |
| `$bootloader`  | `?\Closure`  | Стартовая инициализация воркера. Замыкание один раз глубоко копируется и выполняется в каждом воркере **до** основного цикла обработки задач. Удобно для autoload, прогрева пулов соединений, прекомпиляции opcache. Если bootloader бросит исключение, весь пул считается несостоявшимся. |
| `$coroutine`   | `bool`       | Если `true` — каждая задача запускается **как корутина** в своей дочерней области (scope), вложенной в общую область пула воркера. Внутри задачи можно делать `await`, использовать channels, IO и `spawn` — всё без блокировки OS-потока. |
| `$concurrency` | `int`        | Лимит одновременно живых корутин внутри одного воркера. Используется только при `coroutine: true`. `0` (по умолчанию) — без лимита. |

## Исключения

Выбрасывает `\ValueError`, если `$workers < 0` или `$queueSize < 0`.

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

### Пример #3 Bootloader — стартовая инициализация воркера

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... submit-задачи увидят полностью инициализированное окружение ...

    $pool->close();
});
```

### Пример #4 Coroutine-mode — внутри задачи можно делать await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // обычный блокирующий вызов корректно паркует корутину,
        // а не блокирует OS-поток воркера
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Пример #5 Автодетект числа воркеров по доступным CPU

```php
<?php

use Async\ThreadPool;

// workers: 0 (по умолчанию) → Async\available_parallelism()
$pool = new ThreadPool();   // учитывает cgroup-квоту контейнера / affinity
```

## Смотрите также

- [ThreadPool::submit()](/ru/docs/reference/thread-pool/submit.html) — добавление задачи в пул
- [ThreadPool::close()](/ru/docs/reference/thread-pool/close.html) — плановое завершение работы
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — отдельный поток для одной задачи
