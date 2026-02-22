---
layout: docs
lang: es
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /es/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Adquirir un recurso del pool con espera."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Adquiere un recurso del pool. Si no hay recursos libres disponibles y se ha alcanzado
el límite máximo, la corrutina se bloquea hasta que un recurso esté disponible.

Si el pool tiene un recurso libre, se devuelve inmediatamente. Si no hay recursos libres
pero el límite `max` no se ha alcanzado, se crea un nuevo recurso mediante `factory`. En caso contrario,
la llamada espera a que se libere un recurso.

## Parámetros

**timeout**
: Tiempo máximo de espera en milisegundos.
  `0` — esperar indefinidamente.
  Si se excede el tiempo de espera, se lanza una `PoolException`.

## Valor de retorno

Devuelve un recurso del pool.

## Errores

Lanza `Async\PoolException` si:
- Se excede el tiempo de espera.
- El pool está cerrado.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Obtener una conexión (espera si es necesario)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Ejemplo #2 Con tiempo de espera

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // esperar como máximo 5 segundos
    // trabajar con la conexión...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Error al adquirir recurso: {$e->getMessage()}\n";
}
```

## Ver también

- [Pool::tryAcquire](/es/docs/reference/pool/try-acquire.html) — Adquisición de recurso sin bloqueo
- [Pool::release](/es/docs/reference/pool/release.html) — Liberar un recurso de vuelta al pool
- [Pool::__construct](/es/docs/reference/pool/construct.html) — Crear un pool
