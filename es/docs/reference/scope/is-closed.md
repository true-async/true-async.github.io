---
layout: docs
lang: es
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Verifica si el ámbito está cerrado."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Verifica si el ámbito está cerrado. Un ámbito se considera cerrado después de una llamada a `dispose()` o `disposeSafely()`. No se pueden agregar nuevas corrutinas a un ámbito cerrado.

## Valor de retorno

`bool` — `true` si el ámbito está cerrado, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar el estado del ámbito

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Ejemplo #2 Protección contra agregar a un ámbito cerrado

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## Ver también

- [Scope::isFinished](/es/docs/reference/scope/is-finished.html) — Verificar si el ámbito ha finalizado
- [Scope::isCancelled](/es/docs/reference/scope/is-cancelled.html) — Verificar si el ámbito está cancelado
- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cerrar el ámbito
