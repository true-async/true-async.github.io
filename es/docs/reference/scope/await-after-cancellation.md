---
layout: docs
lang: es
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /es/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Espera a que todas las corrutinas, incluidas las zombis, finalicen después de la cancelación del ámbito."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Espera a que **todas** las corrutinas del ámbito finalicen, incluidas las corrutinas zombis. Requiere una llamada previa a `cancel()`. Este método se utiliza para la terminación ordenada del ámbito cuando es necesario esperar hasta que todas las corrutinas (incluidas las zombis) terminen su trabajo.

## Parámetros

`errorHandler` — una función callback para manejar errores de corrutinas zombis. Acepta un `\Throwable` como argumento. Si es `null`, los errores se ignoran.

`cancellation` — un objeto `Awaitable` para interrumpir la espera. Si es `null`, la espera no tiene límite de tiempo.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Terminación ordenada con manejo de errores

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// First, cancel
$scope->cancel();

// Then wait for all coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### Ejemplo #2 Espera con tiempo límite

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie coroutine that takes a long time to finish
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Resource cleanup
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## Ver también

- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar todas las corrutinas
- [Scope::awaitCompletion](/es/docs/reference/scope/await-completion.html) — Esperar a las corrutinas activas
- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cancelar y cerrar el ámbito
