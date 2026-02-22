---
layout: docs
lang: es
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /es/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Liberar un recurso de vuelta al pool."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Devuelve un recurso previamente adquirido al pool. Si se estableció un hook `beforeRelease`
al crear el pool, se invoca antes de la devolución. Si el hook
devuelve `false`, el recurso se destruye en lugar de ser devuelto al pool.

Si hay corrutinas esperando un recurso mediante `acquire()`, el recurso se
entrega inmediatamente a la primera corrutina en espera.

## Parámetros

**resource**
: Un recurso previamente adquirido mediante `acquire()` o `tryAcquire()`.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Devolución segura mediante finally

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### Ejemplo #2 Destrucción automática mediante beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // Si la conexión está rota — no devolver al pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // Si isAlive() devuelve false, el cliente será destruido
    $pool->release($client);
}
```

## Ver también

- [Pool::acquire](/es/docs/reference/pool/acquire.html) — Adquirir un recurso del pool
- [Pool::tryAcquire](/es/docs/reference/pool/try-acquire.html) — Adquisición sin bloqueo
- [Pool::close](/es/docs/reference/pool/close.html) — Cerrar el pool
