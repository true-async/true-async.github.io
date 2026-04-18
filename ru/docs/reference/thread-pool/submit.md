---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Отправить задачу в пул потоков и получить Future для её результата."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Добавляет задачу во внутреннюю очередь пула. Свободный рабочий поток забирает её, выполняет и разрешает возвращённый `Future` возвращаемым значением. Если очередь заполнена, вызывающая корутина приостанавливается до освобождения слота.

## Параметры

| Параметр  | Тип        | Описание                                                                                                                                  |
|-----------|------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | Callable, выполняемый в рабочем потоке. Глубоко копируется в поток — замыкания, захватывающие объекты или ресурсы, выбросят `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Дополнительные аргументы, передаваемые в `$task`. Также глубоко копируются.                                                              |

## Возвращаемое значение

`Async\Future` — разрешается с возвращаемым значением `$task` или отклоняется с исключением, брошенным в `$task`.

## Исключения

- `Async\ThreadPoolException` — выбрасывается немедленно, если пул был закрыт через `close()` или `cancel()`.
- `Async\ThreadTransferException` — выбрасывается, если `$task` или любой из аргументов не может быть сериализован для передачи (например, `stdClass`, PHP-ссылки, ресурсы).

## Примеры

### Пример #1 Базовая отправка задачи и ожидание результата

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### Пример #2 Обработка исключения из задачи

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### Пример #3 Параллельная отправка нескольких задач

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## Смотрите также

- [ThreadPool::map()](/ru/docs/reference/thread-pool/map.html) — параллельный map по массиву
- [ThreadPool::close()](/ru/docs/reference/thread-pool/close.html) — плановое завершение работы
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента и правила передачи данных
