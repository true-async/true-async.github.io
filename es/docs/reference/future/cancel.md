---
layout: docs
lang: es
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /es/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Cancela el Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Cancela el `Future`. Todas las corrutinas que esperan este Future mediante `await()` recibirán una `CancelledException`. Si se proporciona el parámetro `$cancellation`, se usará como razón de cancelación.

## Parámetros

`cancellation` — una excepción de cancelación personalizada. Si es `null`, se usa la `CancelledException` por defecto.

## Valor de retorno

La función no devuelve un valor.

## Ejemplos

### Ejemplo #1 Cancelación básica del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Una corrutina esperando el resultado
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelado\n";
    }
});

// Cancelar el Future
$future->cancel();
```

### Ejemplo #2 Cancelación con razón personalizada

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Razón: " . $e->getMessage() . "\n";
        // Razón: Tiempo de espera excedido
    }
});

$future->cancel(new AsyncCancellation("Tiempo de espera excedido"));
```

## Ver también

- [Future::isCancelled](/es/docs/reference/future/is-cancelled.html) — Verificar si el Future está cancelado
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado
- [Future::catch](/es/docs/reference/future/catch.html) — Manejar errores del Future
