---
layout: docs
lang: es
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /es/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Cancela todas las corrutinas y cierra el ámbito."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Cierra el ámbito y cancela todas las corrutinas que contiene. Después de llamar a `dispose()`, el ámbito se marca como cerrado y cancelado. No se pueden agregar nuevas corrutinas a un ámbito cerrado.

Para un ámbito sin la bandera dispose-safely (la que tiene `new Scope()` por defecto), esto equivale a llamar a `cancel()` y luego cerrar el ámbito. Un ámbito que lleva la bandera, activada con `allowZombies()` o heredada de un padre que la tiene, como el ámbito principal, deja sus corrutinas ejecutándose como zombis en su lugar, igual que `disposeSafely()`.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Cierre forzado de un ámbito

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\AsyncCancellation) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// All coroutines will be cancelled, scope closed
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Ejemplo #2 Limpieza en un bloque try/finally

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Business logic
        \Async\delay(5000);
    });

    $scope->awaitCompletion(Async\timeout(5000));
} finally {
    $scope->dispose();
}
```

## Ver también

- [Scope::disposeSafely](/es/docs/reference/scope/dispose-safely.html) — Cierre seguro (con zombis)
- [Scope::disposeAfterTimeout](/es/docs/reference/scope/dispose-after-timeout.html) — Cerrar después de un tiempo límite
- [Scope::cancel](/es/docs/reference/scope/cancel.html) — Cancelar sin cerrar el ámbito
