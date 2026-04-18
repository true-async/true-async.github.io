---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Detener forzosamente el pool de hilos, rechazando de inmediato todas las tareas en cola."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Inicia un apagado forzado del pool. Después de llamar a `cancel()`:

- Cualquier llamada posterior a `submit()` lanza inmediatamente `Async\ThreadPoolException`.
- Las tareas que esperan en la cola (aún no recogidas por un trabajador) son **rechazadas inmediatamente** — sus objetos `Future` correspondientes pasan al estado rechazado con una `ThreadPoolException`.
- Las tareas que ya se están ejecutando en los hilos de trabajo se ejecutan hasta la finalización de la tarea actual (interrumpir forzosamente código PHP dentro de un hilo no es posible).
- Los trabajadores se detienen tan pronto como terminan la tarea actual y no recogen ninguna tarea nueva de la cola.

Para un apagado gracioso que permita que todas las tareas en cola finalicen, use [`close()`](/es/docs/reference/thread-pool/close.html) en su lugar.

## Valor de retorno

`void`

## Ejemplos

### Ejemplo #1 Cancelación forzada con tareas en cola

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Llenar la cola con 8 tareas en 2 trabajadores
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Cancelar inmediatamente — las tareas en la cola son rechazadas
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "completadas: $done\n";   // 2  (ya en ejecución cuando se llamó a cancel())
    echo "canceladas:  $cancelled\n"; // 6  (aún estaban en la cola)
});
```

## Véase también

- [ThreadPool::close()](/es/docs/reference/thread-pool/close.html) — apagado gracioso
- [ThreadPool::isClosed()](/es/docs/reference/thread-pool/is-closed.html) — comprobar si el pool está cerrado
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente y comparación close() vs cancel()
