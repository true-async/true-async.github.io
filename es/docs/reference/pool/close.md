---
layout: docs
lang: es
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /es/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Cerrar el pool y destruir todos los recursos."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Cierra el pool de recursos. Todos los recursos inactivos son destruidos mediante el `destructor`
(si se proporcionó uno). Todas las corrutinas que esperan un recurso mediante `acquire()` reciben
una `PoolException`. Después del cierre, cualquier llamada a `acquire()` y `tryAcquire()`
lanza una excepción.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Cierre ordenado

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Cerrar todas las sentencias preparadas y la conexión
    },
    min: 2,
    max: 10
);

// ... trabajar con el pool ...

// Cerrar el pool cuando la aplicación se detenga
$pool->close();
```

### Ejemplo #2 Las corrutinas en espera reciben una excepción

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // tomó el único recurso

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // esperando la liberación
    } catch (PoolException $e) {
        echo "Pool cerrado: {$e->getMessage()}\n";
    }
});

$pool->close(); // la corrutina en espera recibirá PoolException
```

## Ver también

- [Pool::isClosed](/es/docs/reference/pool/is-closed.html) — Verificar si el pool está cerrado
- [Pool::__construct](/es/docs/reference/pool/construct.html) — Crear un pool
