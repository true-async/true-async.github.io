---
layout: docs
lang: es
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /es/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback que siempre se ejecuta al completar el Future."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Registra un callback que se ejecuta cuando el `Future` se completa independientemente del resultado --- éxito, error o cancelación. El Future se resuelve con el mismo valor o error que el original. Útil para liberar recursos.

## Parámetros

`finally` — la función a ejecutar al completar. No recibe argumentos. Firma: `function(): void`.

## Valor de retorno

`Future` — un nuevo Future que se completará con el mismo valor o error que el original.

## Ejemplos

### Ejemplo #1 Liberación de recursos

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Conexión cerrada\n";
});

$users = $future->await();
```

### Ejemplo #2 Encadenamiento con map, catch y finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operación completada\n";
});

$result = $future->await();
```

## Ver también

- [Future::map](/es/docs/reference/future/map.html) — Transformar el resultado del Future
- [Future::catch](/es/docs/reference/future/catch.html) — Manejar un error del Future
- [Future::ignore](/es/docs/reference/future/ignore.html) — Ignorar errores no manejados
