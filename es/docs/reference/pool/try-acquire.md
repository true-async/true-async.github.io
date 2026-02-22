---
layout: docs
lang: es
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /es/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Adquisición de recurso del pool sin bloqueo."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Intenta adquirir un recurso del pool sin bloquear. Si hay un recurso libre disponible
o el límite `max` no se ha alcanzado, devuelve el recurso inmediatamente.
En caso contrario, devuelve `null`.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

Devuelve un recurso del pool o `null` si no hay recursos libres disponibles
y se ha alcanzado el límite máximo.

## Ejemplos

### Ejemplo #1 Intento de adquirir un recurso

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "Todas las conexiones están ocupadas, intente más tarde\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Pedidos: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Ejemplo #2 Alternativa cuando el pool no está disponible

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Caché no disponible — consultar la base de datos directamente
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## Ver también

- [Pool::acquire](/es/docs/reference/pool/acquire.html) — Adquisición de recurso con bloqueo
- [Pool::release](/es/docs/reference/pool/release.html) — Liberar un recurso de vuelta al pool
