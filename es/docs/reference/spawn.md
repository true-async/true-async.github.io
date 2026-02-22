---
layout: docs
lang: es
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /es/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — lanzar una función en una nueva corrutina. Documentación completa: parámetros, valor de retorno, ejemplos."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Lanza una función para ejecución en una nueva corrutina. Crea una corrutina.

## Descripción

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Crea e inicia una nueva corrutina. La corrutina se ejecutará de forma asíncrona.

## Parámetros

**`callback`**
Una función o closure a ejecutar en la corrutina. Puede ser cualquier tipo callable válido.

**`args`**
Parámetros opcionales pasados a `callback`. Los parámetros se pasan por valor.

## Valores de retorno

Devuelve un objeto `Async\Coroutine` que representa la corrutina lanzada. El objeto puede usarse para:
- Obtener el resultado mediante `await()`
- Cancelar la ejecución mediante `cancel()`
- Verificar el estado de la corrutina

## Ejemplos

### Ejemplo #1 Uso básico de spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// La corrutina se ejecuta de forma asíncrona
echo "Corrutina iniciada\n";

$result = await($coroutine);
echo "Resultado recibido\n";
?>
```

### Ejemplo #2 Múltiples corrutinas

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// Todas las solicitudes se ejecutan concurrentemente
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Descargado: " . strlen($content) . " bytes\n";
}
?>
```

### Ejemplo #3 Uso con un closure

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Ejemplo #4 spawn con Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Corrutina 1\n";
});

$scope->spawn(function() {
    echo "Corrutina 2\n";
});

// Esperar a que todas las corrutinas del scope se completen
$scope->awaitCompletion();
?>
```

### Ejemplo #5 Paso de parámetros

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Suma: $result\n"; // Suma: 60
?>
```

### Ejemplo #6 Manejo de errores

Una forma de manejar una excepción de una corrutina es usar la función `await()`:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Error aleatorio");
    }
    return "Éxito";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## Notas

> **Nota:** Las corrutinas creadas mediante `spawn()` se ejecutan concurrentemente, pero no en paralelo.
> PHP TrueAsync utiliza un modelo de ejecución de un solo hilo.

> **Nota:** Los parámetros se pasan a la corrutina por valor.
> Para pasar por referencia, use un closure con `use (&$var)`.

## Registro de cambios

| Versión  | Descripción                        |
|----------|------------------------------------|
| 1.0.0    | Se añadió la función `spawn()`    |

## Ver también

- [await()](/es/docs/reference/await.html) - Esperar el resultado de una corrutina
- [suspend()](/es/docs/reference/suspend.html) - Suspender la ejecución de una corrutina
