---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Verifica se il pool di thread è stato arrestato."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Restituisce `true` se il pool è stato arrestato tramite [`close()`](/it/docs/reference/thread-pool/close.html) o [`cancel()`](/it/docs/reference/thread-pool/cancel.html). Restituisce `false` finché il pool accetta ancora task.

## Valore restituito

`bool` — `true` se il pool è chiuso; `false` se è ancora attivo.

## Esempi

### Esempio #1 Verifica dello stato prima dell'invio

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

### Esempio #2 Proteggere submit() in contesti condivisi

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

## Vedere anche

- [ThreadPool::close()](/it/docs/reference/thread-pool/close.html) — arresto controllato
- [ThreadPool::cancel()](/it/docs/reference/thread-pool/cancel.html) — arresto forzato
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
