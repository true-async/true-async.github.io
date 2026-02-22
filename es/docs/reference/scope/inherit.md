---
layout: docs
lang: es
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /es/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Crea un nuevo Scope que hereda del ámbito especificado o del actual."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Crea un nuevo `Scope` que hereda del ámbito padre especificado. Si el parámetro `$parentScope` no se proporciona (o es `null`), el nuevo ámbito hereda del ámbito activo actual.

El ámbito hijo hereda los manejadores de excepciones y las políticas de cancelación del padre.

## Parámetros

`parentScope` — el ámbito padre del cual heredará el nuevo ámbito. Si es `null`, se utiliza el ámbito activo actual.

## Valor de retorno

`Scope` — un nuevo ámbito hijo.

## Ejemplos

### Ejemplo #1 Crear un ámbito hijo a partir del actual

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Inside the coroutine, the current scope is $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Ejemplo #2 Especificar explícitamente el ámbito padre

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// Cancelling the parent also cancels the child scope
$rootScope->cancel();
```

## Ver también

- [Scope::\_\_construct](/es/docs/reference/scope/construct.html) — Crear un Scope raíz
- [Scope::getChildScopes](/es/docs/reference/scope/get-child-scopes.html) — Obtener ámbitos hijos
- [Scope::dispose](/es/docs/reference/scope/dispose.html) — Cancelar y cerrar el ámbito
