---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Створення нового ThreadPool із фіксованою кількістю робочих потоків."
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

Створює новий пул потоків і одразу запускає всі робочі потоки. Потоки лишаються активними протягом усього часу життя пулу, що усуває накладні витрати на запуск потоку для кожного завдання.

## Параметри

| Параметр       | Тип          | Опис                                                                                                              |
|----------------|--------------|-------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`        | Кількість робочих потоків. `0` (за замовчуванням) — автодетект через [`Async\available_parallelism()`](/uk/docs/reference/available-parallelism.html). |
| `$queueSize`   | `int`        | Максимальна довжина черги очікуючих завдань. `0` (за замовчуванням) — `workers × 4`. Коли черга повна, `submit()` призупиняє корутину, що викликає, до звільнення слота. |
| `$bootloader`  | `?\Closure`  | Стартова ініціалізація воркера. Замикання один раз глибоко копіюється і виконується в кожному воркері **до** основного циклу обробки завдань. Зручно для autoload, прогріву пулів з'єднань, прекомпіляції opcache. Якщо bootloader кине виняток, увесь пул вважається невдалим. |
| `$coroutine`   | `bool`       | Якщо `true` — кожне завдання запускається **як корутина** у своїй дочірній області (scope), вкладеній у спільну область пулу воркера. Усередині завдання можна робити `await`, використовувати channels, IO і `spawn` — усе без блокування OS-потоку. |
| `$concurrency` | `int`        | Ліміт одночасно живих корутин усередині одного воркера. Використовується лише при `coroutine: true`. `0` (за замовчуванням) — без ліміту. |

## Винятки

Кидає `\ValueError`, якщо `$workers < 0` або `$queueSize < 0`.

## Приклади

### Приклад #1 Базове створення пулу

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 робочі потоки, розмір черги за замовчуванням — 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Приклад #2 Явне вказання розміру черги

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 робочі потоки, черга обмежена 64 завданнями
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... надсилаємо завдання ...

    $pool->close();
});
```

### Приклад #3 Bootloader — стартова ініціалізація воркера

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

    // ... submit-завдання побачать повністю ініціалізоване оточення ...

    $pool->close();
});
```

### Приклад #4 Coroutine-mode — усередині завдання можна робити await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // звичайний блокуючий виклик коректно паркує корутину,
        // а не блокує OS-потік воркера
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Приклад #5 Автодетект кількості воркерів за доступними CPU

```php
<?php

use Async\ThreadPool;

// workers: 0 (за замовчуванням) → Async\available_parallelism()
$pool = new ThreadPool();   // враховує cgroup-квоту контейнера / affinity
```

## Дивіться також

- [ThreadPool::submit()](/uk/docs/reference/thread-pool/submit.html) — додавання завдання до пулу
- [ThreadPool::close()](/uk/docs/reference/thread-pool/close.html) — планове завершення роботи
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
- [`spawn_thread()`](/uk/docs/reference/spawn-thread.html) — окремий потік для одного завдання
