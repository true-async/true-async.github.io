---
layout: docs
lang: es
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /es/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Manejar un error del Future."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Registra un manejador de errores para el `Future`. El callback se invoca si el Future se completó con una excepción. Si el callback devuelve un valor, este se convierte en el resultado del nuevo Future. Si el callback lanza una excepción, el nuevo Future se completa con ese error.

## Parámetros

`catch` — la función de manejo de errores. Recibe un `Throwable`, puede devolver un valor para recuperación. Firma: `function(\Throwable $e): mixed`.

## Valor de retorno

`Future` — un nuevo Future con el resultado del manejo de errores, o con el valor original si no hubo error.

## Ejemplos

### Ejemplo #1 Manejo de errores con recuperación

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Servicio no disponible"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "valor por defecto"; // Recuperación
    });

$result = $future->await();
echo $result; // valor por defecto
```

### Ejemplo #2 Captura de errores en operaciones asíncronas

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("Error HTTP: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Registrar el error y devolver un array vacío
    error_log("Error de API: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Usuarios encontrados: $count\n";
```

## Ver también

- [Future::map](/es/docs/reference/future/map.html) — Transformar el resultado del Future
- [Future::finally](/es/docs/reference/future/finally.html) — Callback al completar el Future
- [Future::ignore](/es/docs/reference/future/ignore.html) — Ignorar errores no manejados
