---
layout: docs
lang: es
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /es/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Establece un manejador de excepciones para los Scopes hijos."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Establece un manejador de excepciones para las excepciones lanzadas en los ámbitos hijos. Cuando un ámbito hijo termina con un error, se llama a este manejador, evitando que la excepción se propague al ámbito padre.

## Parámetros

`exceptionHandler` — la función de manejo de excepciones para los ámbitos hijos. Acepta un `\Throwable` como argumento.

## Valor de retorno

No se devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Capturar errores de ámbitos hijos

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// Error handled, does not propagate to $parentScope
```

### Ejemplo #2 Aislar errores entre módulos

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// Each module in its own scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // An error here will not affect $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## Ver también

- [Scope::setExceptionHandler](/es/docs/reference/scope/set-exception-handler.html) — Manejador de excepciones para corrutinas
- [Scope::inherit](/es/docs/reference/scope/inherit.html) — Crear un ámbito hijo
- [Scope::getChildScopes](/es/docs/reference/scope/get-child-scopes.html) — Obtener ámbitos hijos
