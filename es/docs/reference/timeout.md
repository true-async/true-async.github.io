---
layout: docs
lang: es
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /es/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — crear un objeto de timeout para limitar el tiempo de espera."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Crea un objeto `Async\Timeout` que se activa después del número especificado de milisegundos.

## Descripción

```php
timeout(int $ms): Async\Awaitable
```

Crea un temporizador que lanza `Async\TimeoutException` después de `$ms` milisegundos.
Se usa como limitador de tiempo de espera en `await()` y otras funciones.

## Parámetros

**`ms`**
Tiempo en milisegundos. Debe ser mayor que 0.

## Valores de retorno

Devuelve un objeto `Async\Timeout` que implementa `Async\Completable`.

## Errores/Excepciones

- `ValueError` — si `$ms` <= 0.

## Ejemplos

### Ejemplo #1 Timeout en await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "La solicitud no se completó en 3 segundos\n";
}
?>
```

### Ejemplo #2 Timeout en un grupo de tareas

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "No todas las solicitudes se completaron en 5 segundos\n";
}
?>
```

### Ejemplo #3 Cancelar un timeout

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// La operación se completó más rápido — cancelar el temporizador
$timer->cancel();
?>
```

## Ver también

- [delay()](/es/docs/reference/delay.html) — suspender una corrutina
- [await()](/es/docs/reference/await.html) — espera con cancelación
