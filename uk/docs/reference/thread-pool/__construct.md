---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Створити новий ThreadPool із фіксованою кількістю робочих потоків."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Створює новий пул потоків і одразу запускає всі робочі потоки. Робочі потоки залишаються активними протягом усього часу існування пулу, що усуває накладні витрати на запуск потоку для кожного завдання.

## Параметри

| Параметр     | Тип   | Опис                                                                                                                                                               |
|--------------|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Кількість робочих потоків, які потрібно створити. Має бути ≥ 1. Усі потоки запускаються під час конструювання.                                                    |
| `$queueSize` | `int` | Максимальна кількість завдань, які можуть очікувати в черзі. `0` (за замовчуванням) означає `$workers × 4`. Коли черга заповнена, `submit()` призупиняє викликаючу корутину до появи вільного місця. |

## Винятки

Кидає `\ValueError`, якщо `$workers < 1`.

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

### Приклад #2 Явний розмір черги

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 робочі потоки, черга обмежена 64 завданнями
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... додавати завдання ...

    $pool->close();
});
```

## Дивіться також

- [ThreadPool::submit()](/uk/docs/reference/thread-pool/submit.html) — додати завдання до пулу
- [ThreadPool::close()](/uk/docs/reference/thread-pool/close.html) — м'яке завершення роботи
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
- [`spawn_thread()`](/uk/docs/reference/spawn-thread.html) — окремий потік для одного завдання
