---
layout: docs
lang: es
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /es/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Aplicar un callable a cada elemento del array en paralelo usando el pool de hilos."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Envía `$task($item)` para cada elemento de `$items` a los trabajadores del pool de forma concurrente, luego bloquea la corrutina llamante hasta que todas las tareas finalicen. Devuelve los resultados en el mismo orden que el array de entrada, independientemente del orden en que los trabajadores los completen.

Si alguna tarea lanza una excepción, `map()` la relanza en la corrutina llamante. Las demás tareas en vuelo no se cancelan.

## Parámetros

| Parámetro | Tipo       | Descripción                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | Los elementos de entrada. Cada elemento se pasa como primer argumento a `$task`.                         |
| `$task`   | `callable` | El callable a aplicar a cada elemento. Se ejecuta en un hilo de trabajo; se aplican las mismas reglas de transferencia de datos que con `submit()`. |

## Valor de retorno

`array` — resultados de `$task` para cada elemento de entrada, en el mismo orden que `$items`.

## Excepciones

- `Async\ThreadPoolException` — si el pool ha sido cerrado.
- Relanza la primera excepción lanzada por cualquier tarea.

## Ejemplos

### Ejemplo #1 Contar líneas en múltiples archivos en paralelo

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} líneas\n";
    }

    $pool->close();
});
```

### Ejemplo #2 Cálculo numérico en paralelo

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $inputs = [1_000_000, 2_000_000, 3_000_000, 4_000_000];

    $results = $pool->map($inputs, function(int $n) {
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    foreach ($inputs as $i => $n) {
        echo "$n iteraciones → {$results[$i]}\n";
    }

    $pool->close();
});
```

## Véase también

- [ThreadPool::submit()](/es/docs/reference/thread-pool/submit.html) — enviar una sola tarea y obtener un Future
- [Async\ThreadPool](/es/docs/components/thread-pool.html) — resumen del componente
