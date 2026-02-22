---
layout: docs
lang: es
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /es/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Crea un Future completado con un error."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Crea un `Future` que se completa inmediatamente con el error especificado. Llamar a `await()` en dicho Future lanzará la excepción proporcionada.

## Parámetros

`throwable` — la excepción con la que se completará el Future.

## Valor de retorno

`Future` — un Future completado con un error.

## Ejemplos

### Ejemplo #1 Crear un Future con un error

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Error de carga"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Capturado: " . $e->getMessage() . "\n";
    // Capturado: Error de carga
}
```

### Ejemplo #2 Uso para retorno temprano de error

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("El host no puede estar vacío")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## Ver también

- [Future::completed](/es/docs/reference/future/completed.html) — Crear un Future con un resultado
- [Future::catch](/es/docs/reference/future/catch.html) — Manejar un error del Future
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado
