---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Comprobar si el pool de hilos ha sido cerrado."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Devuelve `true` si el pool ha sido cerrado mediante [`close()`](/es/docs/reference/thread-pool/close.html) o [`cancel()`](/es/docs/reference/thread-pool/cancel.html). Devuelve `false` mientras el pool todavía acepta tareas.

## Valor de retorno

`bool` — `true` si el pool está cerrado; `false` si aún está activo.

## Ejemplos

### Ejemplo #1 Comprobar el estado antes de enviar

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

### Ejemplo #2 Proteger submit en contextos compartidos

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
    echo trySubmit($pool, fn() => 'hola'), "\n"; // hola
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'perdido')); // NULL
});
```

## Véase también

- [ThreadPool::close()](/es/docs/reference/thread-pool/close.html) — apagado gracioso
- [ThreadPool::cancel()](/es/docs/reference/thread-pool/cancel.html) — apagado forzado
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
