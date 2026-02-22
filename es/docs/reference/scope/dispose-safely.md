---
layout: docs
lang: es
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /es/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Cierra el ámbito de forma segura — las corrutinas se convierten en zombis."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Cierra el ámbito de forma segura. Las corrutinas activas **no se cancelan**, sino que se convierten en corrutinas zombis: continúan ejecutándose, pero el ámbito se considera cerrado. Las corrutinas zombis terminarán por sí solas cuando completen su trabajo.

Si el ámbito está marcado como "no seguro" mediante `asNotSafely()`, las corrutinas serán canceladas en lugar de convertirse en zombis.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// Scope is closed, but the coroutine continues running
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Coroutine continues executing in the background
```

### Ejemplo #2 Terminación ordenada con espera de zombis

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// Wait for zombie coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## Ver también

- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cerrar el ámbito de forma forzada
- [Scope::asNotSafely](/es/docs/reference/scope/as-not-safely.html) — Desactivar el comportamiento zombi
- [Scope::awaitAfterCancellation](/es/docs/reference/scope/await-after-cancellation.html) — Esperar a las corrutinas zombis
