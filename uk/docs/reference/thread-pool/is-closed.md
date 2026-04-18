---
layout: docs
lang: uk
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Перевірити, чи завершив роботу пул потоків."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Повертає `true`, якщо пул завершив роботу через [`close()`](/uk/docs/reference/thread-pool/close.html) або [`cancel()`](/uk/docs/reference/thread-pool/cancel.html). Повертає `false`, поки пул ще приймає завдання.

## Значення, що повертається

`bool` — `true`, якщо пул закритий; `false`, якщо він ще активний.

## Приклади

### Приклад #1 Перевірка стану перед надсиланням завдання

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

### Приклад #2 Захист submit() у спільних контекстах

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

## Дивіться також

- [ThreadPool::close()](/uk/docs/reference/thread-pool/close.html) — м'яке завершення роботи
- [ThreadPool::cancel()](/uk/docs/reference/thread-pool/cancel.html) — примусове завершення роботи
- [Async\ThreadPool](/uk/docs/components/thread-pool.html) — огляд компонента
