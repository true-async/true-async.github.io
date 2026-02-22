---
layout: docs
lang: es
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /es/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Cancela todas las corrutinas del ámbito."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Cancela todas las corrutinas que pertenecen al ámbito dado. Cada corrutina activa recibirá una `CancelledException`. Si se especifica `$cancellationError`, se utilizará como motivo de la cancelación.

## Parámetros

`cancellationError` — una excepción de cancelación personalizada. Si es `null`, se utiliza la `CancelledException` estándar.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Cancelación básica

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Long operation
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// Cancel all coroutines
$scope->cancel();
```

### Ejemplo #2 Cancelación con un error personalizado

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## Ver también

- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cancelar y cerrar el ámbito
- [Scope::isCancelled](/es/docs/reference/scope/is-cancelled.html) — Verificar si el ámbito está cancelado
- [Scope::awaitAfterCancellation](/es/docs/reference/scope/await-after-cancellation.html) — Esperar después de la cancelación
