---
layout: docs
lang: es
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /es/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — iteración concurrente sobre un array o Traversable con control de concurrencia y gestión del ciclo de vida de las corrutinas generadas."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Itera concurrentemente sobre un array o `Traversable`, llamando a un `callback` para cada elemento.

## Descripción

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Ejecuta `callback` para cada elemento de `iterable` en una corrutina separada.
El parámetro `concurrency` permite limitar el número de callbacks ejecutándose simultáneamente.
La función bloquea la corrutina actual hasta que todas las iteraciones se completen.

Todas las corrutinas generadas a través de `iterate()` se ejecutan en un `Scope` hijo aislado.

## Parámetros

**`iterable`**
Un array o un objeto que implementa `Traversable` (incluyendo generadores y `ArrayIterator`).

**`callback`**
Una función llamada para cada elemento. Acepta dos argumentos: `(mixed $value, mixed $key)`.
Si el callback devuelve `false`, la iteración se detiene.

**`concurrency`**
Número máximo de callbacks ejecutándose simultáneamente. Por defecto `0` — el límite por defecto,
todos los elementos se procesan concurrentemente. Un valor de `1` significa ejecución en una sola corrutina.

**`cancelPending`**
Controla el comportamiento de las corrutinas hijas generadas dentro del callback (mediante `spawn()`) después de que la iteración se complete.
- `true` (por defecto) — todas las corrutinas generadas sin terminar se cancelan con `AsyncCancellation`.
- `false` — `iterate()` espera a que todas las corrutinas generadas se completen antes de retornar.

## Valores de retorno

La función no devuelve ningún valor.

## Errores/Excepciones

- `Error` — si se llama fuera de un contexto async o desde el contexto del planificador.
- `TypeError` — si `iterable` no es un array y no implementa `Traversable`.
- Si el callback lanza una excepción, la iteración se detiene, las corrutinas restantes se cancelan y la excepción se propaga al código que la invocó.

## Ejemplos

### Ejemplo #1 Iteración básica sobre un array

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "Todas las solicitudes completadas\n";
});
?>
```

### Ejemplo #2 Limitación de concurrencia

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Procesar no más de 10 usuarios simultáneamente
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "Usuario $userId cargado\n";
    }, concurrency: 10);

    echo "Todos los usuarios procesados\n";
});
?>
```

### Ejemplo #3 Detener iteración por condición

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Procesando: $item\n";

        if ($item === 'cherry') {
            return false; // Detener iteración
        }
    });

    echo "Iteración finalizada\n";
});
?>
```

**Salida:**
```
Procesando: apple
Procesando: banana
Procesando: cherry
Iteración finalizada
```

### Ejemplo #4 Iteración sobre un generador

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: procesando valor $value\n";
    }, concurrency: 2);

    echo "Todas las tareas completadas\n";
});
?>
```

### Ejemplo #5 Cancelación de corrutinas generadas (cancelPending = true)

Por defecto, las corrutinas generadas mediante `spawn()` dentro del callback se cancelan después de que la iteración se complete:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Generar una tarea en segundo plano
        spawn(function() use ($value) {
            try {
                echo "Tarea en segundo plano $value iniciada\n";
                suspend();
                suspend();
                echo "Tarea en segundo plano $value finalizada\n"; // No se ejecutará
            } catch (AsyncCancellation) {
                echo "Tarea en segundo plano $value cancelada\n";
            }
        });
    });

    echo "Iteración finalizada\n";
});
?>
```

**Salida:**
```
Tarea en segundo plano 1 iniciada
Tarea en segundo plano 2 iniciada
Tarea en segundo plano 3 iniciada
Tarea en segundo plano 1 cancelada
Tarea en segundo plano 2 cancelada
Tarea en segundo plano 3 cancelada
Iteración finalizada
```

### Ejemplo #6 Esperar corrutinas generadas (cancelPending = false)

Si se pasa `cancelPending: false`, `iterate()` esperará a que todas las corrutinas generadas se completen:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Generar una tarea en segundo plano
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // Todas las tareas en segundo plano se han completado
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Salida:**
```
result-1, result-2, result-3
```

### Ejemplo #7 Manejo de errores

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error procesando elemento $value");
            }
            echo "Procesado: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Capturado: " . $e->getMessage() . "\n";
    }
});
?>
```

## Notas

> **Nota:** `iterate()` crea un Scope hijo aislado para todas las corrutinas generadas.

> **Nota:** Cuando se pasa un array, `iterate()` crea una copia antes de iterar.
> Modificar el array original dentro del callback no afecta la iteración.

> **Nota:** Si el `callback` devuelve `false`, la iteración se detiene,
> pero las corrutinas que ya se están ejecutando continúan hasta completarse (o cancelarse, si `cancelPending = true`).

## Registro de cambios

| Versión | Descripción                         |
|---------|-------------------------------------|
| 1.0.0   | Se añadió la función `iterate()`.  |

## Ver también

- [spawn()](/es/docs/reference/spawn.html) - Lanzar una corrutina
- [await_all()](/es/docs/reference/await-all.html) - Esperar múltiples corrutinas
- [Scope](/es/docs/components/scope.html) - El concepto de Scope
- [Cancelación](/es/docs/components/cancellation.html) - Cancelación de corrutinas
