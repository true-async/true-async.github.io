---
layout: docs
lang: es
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /es/docs/reference/await.html
page_title: "await()"
description: "await() — espera a que una corrutina o Future se complete. Documentación completa: parámetros, excepciones, ejemplos."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Espera a que una corrutina, `Async\Future`, o cualquier otro `Async\Completable` se complete.
Devuelve el resultado o lanza una excepción.

## Descripción

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Suspende la ejecución de la corrutina actual hasta que el `Async\Completable` `$awaitable` especificado se complete (o hasta que `$cancellation` se active, si se proporciona) y devuelve el resultado.
Si el `awaitable` ya se ha completado, el resultado se devuelve inmediatamente.

Si la corrutina terminó con una excepción, esta se propagará al código que la invocó.

## Parámetros

**`awaitable`**
Un objeto que implementa la interfaz `Async\Completable` (extiende `Async\Awaitable`). Típicamente es:
- `Async\Coroutine` - el resultado de llamar a `spawn()`
- `Async\TaskGroup` - un grupo de tareas
- `Async\Future` - un valor futuro

**`cancellation`**
Un objeto `Async\Completable` opcional; cuando se completa, la espera será cancelada.

## Valores de retorno

Devuelve el valor que retornó la corrutina. El tipo de retorno depende de la corrutina.

## Errores/Excepciones

Si la corrutina terminó con una excepción, `await()` relanzará esa excepción.

Si la corrutina fue cancelada, se lanzará `Async\AsyncCancellation`.

## Ejemplos

### Ejemplo #1 Uso básico de await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### Ejemplo #2 Espera secuencial

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### Ejemplo #3 Manejo de excepciones

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Error al obtener datos");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Datos recibidos\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### Ejemplo #4 await con TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// Obtener un array con todos los resultados
$results = await($taskGroup);
print_r($results); // Array de resultados
?>
```

### Ejemplo #5 Múltiples await sobre la misma corrutina

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// El primer await esperará el resultado
$result1 = await($coroutine);
echo "$result1\n";

// Los awaits posteriores devuelven el resultado instantáneamente
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Ejemplo #6 await dentro de una corrutina

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Corrutina padre iniciada\n";

    $child = spawn(function() {
        echo "Corrutina hija ejecutándose\n";
        Async\sleep(1000);
        return "Resultado de la hija";
    });

    echo "Esperando a la hija...\n";
    $result = await($child);
    echo "Recibido: $result\n";
});

echo "El código principal continúa\n";
?>
```

## Registro de cambios

| Versión  | Descripción                        |
|----------|------------------------------------|
| 1.0.0    | Se añadió la función `await()`    |

## Ver también

- [spawn()](/es/docs/reference/spawn.html) - Lanzar una corrutina
- [suspend()](/es/docs/reference/suspend.html) - Suspender la ejecución
