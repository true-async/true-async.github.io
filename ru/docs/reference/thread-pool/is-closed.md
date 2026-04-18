---
layout: docs
lang: ru
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Проверить, завершил ли пул потоков работу."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Возвращает `true`, если пул был остановлен через [`close()`](/ru/docs/reference/thread-pool/close.html) или [`cancel()`](/ru/docs/reference/thread-pool/cancel.html). Возвращает `false`, пока пул ещё принимает задачи.

## Возвращаемое значение

`bool` — `true`, если пул закрыт; `false`, если он ещё активен.

## Примеры

### Пример #1 Проверка состояния перед отправкой задачи

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### Пример #2 Защита submit в общем контексте

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## Смотрите также

- [ThreadPool::close()](/ru/docs/reference/thread-pool/close.html) — плановое завершение
- [ThreadPool::cancel()](/ru/docs/reference/thread-pool/cancel.html) — принудительное завершение
- [Async\ThreadPool](/ru/docs/components/thread-pool.html) — обзор компонента
