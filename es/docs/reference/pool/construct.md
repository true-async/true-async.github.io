---
layout: docs
lang: es
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /es/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Crear un nuevo pool de recursos."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Crea un nuevo pool de recursos. El pool gestiona un conjunto de objetos reutilizables
(conexiones, clientes, descriptores de archivos, etc.), creándolos y destruyéndolos
automáticamente según sea necesario.

## Parámetros

**factory**
: Una función de fábrica para crear un nuevo recurso. Se invoca cada vez que
  el pool necesita un nuevo recurso y el recuento actual es menor que `max`.
  Debe devolver un recurso listo para usar.

**destructor**
: Una función para destruir correctamente un recurso. Se invoca cuando el pool se cierra
  o cuando un recurso se elimina (por ejemplo, tras una verificación de salud fallida).
  `null` — el recurso simplemente se elimina del pool sin acciones adicionales.

**healthcheck**
: Una función de verificación de salud del recurso. Recibe un recurso, devuelve `bool`.
  `true` — el recurso está sano, `false` — el recurso será destruido y reemplazado.
  `null` — no se realiza verificación de salud.

**beforeAcquire**
: Un hook que se invoca antes de entregar un recurso. Recibe el recurso.
  Puede usarse para preparar el recurso (por ejemplo, restablecer el estado).
  `null` — sin hook.

**beforeRelease**
: Un hook que se invoca antes de devolver un recurso al pool. Recibe el recurso,
  devuelve `bool`. Si devuelve `false`, el recurso se destruye en lugar de
  ser devuelto al pool.
  `null` — sin hook.

**min**
: El número mínimo de recursos en el pool. Al crear el pool,
  se crean `min` recursos inmediatamente. El valor predeterminado es `0`.

**max**
: El número máximo de recursos en el pool. Cuando se alcanza el límite,
  las llamadas a `acquire()` se bloquean hasta que se libere un recurso.
  El valor predeterminado es `10`.

**healthcheckInterval**
: El intervalo para verificaciones de salud en segundo plano en milisegundos.
  `0` — la verificación en segundo plano está desactivada (solo se verifica al adquirir).

## Ejemplos

### Ejemplo #1 Pool de conexiones PDO

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO se cierra automáticamente al ser eliminado
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // verificar cada 30 segundos
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Ejemplo #2 Pool con hooks

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // restablecer a la base de datos predeterminada
    },
    beforeRelease: function(RedisClient $r): bool {
        // Si la conexión está rota — destruir el recurso
        return $r->isConnected();
    },
    max: 5
);
```

## Ver también

- [Pool::acquire](/es/docs/reference/pool/acquire.html) — Adquirir un recurso del pool
- [Pool::release](/es/docs/reference/pool/release.html) — Liberar un recurso de vuelta al pool
- [Pool::close](/es/docs/reference/pool/close.html) — Cerrar el pool
