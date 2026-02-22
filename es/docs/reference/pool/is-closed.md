---
layout: docs
lang: es
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Verificar si el pool está cerrado."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Verifica si el pool ha sido cerrado mediante una llamada a `close()`.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

Devuelve `true` si el pool está cerrado, `false` si el pool está activo.

## Ejemplos

### Ejemplo #1 Verificar el estado del pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### Ejemplo #2 Uso condicional del pool

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('El pool de conexiones está cerrado');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## Ver también

- [Pool::close](/es/docs/reference/pool/close.html) — Cerrar el pool
- [Pool::getState](/es/docs/reference/pool/get-state.html) — Estado del Circuit Breaker
