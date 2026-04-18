---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Enviar una tarea al pool de hilos y recibir un Future con su resultado."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Agrega una tarea a la cola interna del pool. Un trabajador libre la recoge, la ejecuta y resuelve el `Future` devuelto con el valor de retorno. Si la cola está llena, la corrutina llamante se suspende hasta que haya un slot disponible.

## Parámetros

| Parámetro | Tipo       | Descripción                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | El callable a ejecutar en un hilo de trabajo. Se copia en profundidad al trabajador — los closures que capturen objetos o recursos lanzarán `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Argumentos adicionales pasados a `$task`. También se copian en profundidad.                                         |

## Valor de retorno

`Async\Future` — se resuelve con el valor de retorno de `$task`, o se rechaza con cualquier excepción lanzada por `$task`.

## Excepciones

- `Async\ThreadPoolException` — lanzada inmediatamente si el pool ha sido cerrado mediante `close()` o `cancel()`.
- `Async\ThreadTransferException` — lanzada si `$task` o cualquier argumento no puede ser serializado para su transferencia (por ejemplo, `stdClass`, referencias PHP, recursos).

## Ejemplos

### Ejemplo #1 Submit básico y await

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

### Ejemplo #2 Manejar excepciones de una tarea

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('algo salió mal en el trabajador');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Capturado: ", $e->getMessage(), "\n";
        // Capturado: algo salió mal en el trabajador
    }

    $pool->close();
});
```

### Ejemplo #3 Enviar múltiples tareas en paralelo

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

## Véase también

- [ThreadPool::map()](/es/docs/reference/thread-pool/map.html) — mapa paralelo sobre un array
- [ThreadPool::close()](/es/docs/reference/thread-pool/close.html) — apagado gracioso
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente y reglas de transferencia de datos
