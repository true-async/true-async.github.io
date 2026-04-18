---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Apagar graciosamente el pool de hilos, esperando a que todas las tareas en cola y en ejecución finalicen."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Inicia un apagado gracioso del pool. Después de llamar a `close()`:

- Cualquier llamada posterior a `submit()` lanza inmediatamente `Async\ThreadPoolException`.
- Las tareas que ya están en la cola continúan y se completan normalmente.
- Las tareas que se están ejecutando actualmente en los hilos de trabajo se completan normalmente.
- El método bloquea la corrutina llamante hasta que todas las tareas en progreso hayan finalizado y todos los trabajadores se hayan detenido.

Para un apagado inmediato y forzado que descarte las tareas en cola, use [`cancel()`](/es/docs/reference/thread-pool/cancel.html) en su lugar.

## Valor de retorno

`void`

## Ejemplos

### Ejemplo #1 Apagado gracioso tras enviar todas las tareas

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'terminado';
    });

    $pool->close(); // espera a que la tarea anterior se complete

    echo await($future), "\n"; // terminado

    $pool->close();
});
```

### Ejemplo #2 Enviar después de close lanza una excepción

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'demasiado tarde');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## Véase también

- [ThreadPool::cancel()](/es/docs/reference/thread-pool/cancel.html) — apagado forzado
- [ThreadPool::isClosed()](/es/docs/reference/thread-pool/is-closed.html) — comprobar si el pool está cerrado
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
