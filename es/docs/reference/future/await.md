---
layout: docs
lang: es
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /es/docs/reference/future/await.html
page_title: "Future::await"
description: "Esperar el resultado del Future."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Espera la completitud del `Future` y devuelve su resultado. Bloquea la corrutina actual hasta que el Future se complete. Si el Future se completó con un error, el método lanza esa excepción. Se puede pasar un `Completable` para cancelar la espera por tiempo de espera o condición externa.

## Parámetros

`cancellation` — un objeto de cancelación de espera. Si se proporciona y se activa antes de que el Future se complete, se lanzará una `CancelledException`. Por defecto es `null`.

## Valor de retorno

`mixed` — el resultado del Future.

## Errores

Lanza una excepción si el Future se completó con un error o fue cancelado.

## Ejemplos

### Ejemplo #1 Espera básica del resultado

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Resultado: $result\n"; // Resultado: 42
```

### Ejemplo #2 Manejo de errores durante la espera

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Algo salió mal");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Algo salió mal
}
```

## Ver también

- [Future::isCompleted](/es/docs/reference/future/is-completed.html) — Verificar si el Future está completado
- [Future::cancel](/es/docs/reference/future/cancel.html) — Cancelar el Future
- [Future::map](/es/docs/reference/future/map.html) — Transformar el resultado
